#!/bin/bash
# Test all OpenCode Go model endpoints for liveness
# Usage: ./scripts/test-endpoints.sh [API_KEY]
# If no API_KEY provided, tries $OPENAI_API_KEY, then $OPENCODE_GO_API_KEY

set -uo pipefail

BASE_URL="${OPENAI_BASE_URL:-https://opencode.ai/zen/go/v1}"
API_KEY="${1:-${OPENAI_API_KEY:-${OPENCODE_GO_API_KEY:-}}}"

if [ -z "$API_KEY" ]; then
    echo "Error: No API key provided."
    echo "Usage: $0 [API_KEY]"
    echo "Or set OPENAI_API_KEY or OPENCODE_GO_API_KEY environment variable."
    exit 1
fi

# Models using OpenAI-compatible /chat/completions endpoint
declare -a OPENAI_MODELS=(
    "glm-5.2"
    "glm-5.1"
    "kimi-k2.7-code"
    "kimi-k2.6"
    "deepseek-v4-pro"
    "deepseek-v4-flash"
    "mimo-v2.5"
    "mimo-v2.5-pro"
)

# Models using Anthropic-compatible /messages endpoint
declare -a ANTHROPIC_MODELS=(
    "minimax-m3"
    "minimax-m2.7"
    "minimax-m2.5"
    "qwen3.7-max"
    "qwen3.7-plus"
    "qwen3.6-plus"
)

TEST_PROMPT="Say OK"
MAX_TOKENS=5
CONNECT_TIMEOUT=8
MAX_TIME=15

echo "=============================================="
echo "OpenCode Go Endpoint Health Check"
echo "Base URL: $BASE_URL"
echo "=============================================="
echo ""

# Temporary directory for parallel results
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Test a single OpenAI-compatible model
test_openai_model() {
    local model=$1
    local outfile="$TMPDIR/${model}.txt"
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"$TEST_PROMPT\"}],\"max_tokens\":$MAX_TOKENS}" \
        "${BASE_URL}/chat/completions" \
        --connect-timeout $CONNECT_TIMEOUT \
        --max-time $MAX_TIME 2>/dev/null || echo '{"error":{"message":"Connection failed"}}')
    
    if echo "$response" | grep -q '"choices"' 2>/dev/null; then
        content=$(echo "$response" | grep -oP '"content":\s*"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "✅ UP (response: ${content:-<empty>})" > "$outfile"
    elif echo "$response" | grep -q '"error"' 2>/dev/null; then
        error_msg=$(echo "$response" | grep -oP '"message":\s*"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown error")
        echo "❌ DOWN: $error_msg" > "$outfile"
    else
        echo "❌ DOWN: No valid response" > "$outfile"
    fi
}

# Test a single Anthropic-compatible model
test_anthropic_model() {
    local model=$1
    local outfile="$TMPDIR/${model}.txt"
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_KEY" \
        -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"$TEST_PROMPT\"}],\"max_tokens\":$MAX_TOKENS}" \
        "${BASE_URL}/messages" \
        --connect-timeout $CONNECT_TIMEOUT \
        --max-time $MAX_TIME 2>/dev/null || echo '{"error":{"message":"Connection failed"}}')
    
    if echo "$response" | grep -q '"content"' 2>/dev/null; then
        text=$(echo "$response" | grep -oP '"text":\s*"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "✅ UP (response: ${text:-<empty>})" > "$outfile"
    elif echo "$response" | grep -q '"error"' 2>/dev/null; then
        error_msg=$(echo "$response" | grep -oP '"message":\s*"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown error")
        echo "❌ DOWN: $error_msg" > "$outfile"
    else
        echo "❌ DOWN: No valid response" > "$outfile"
    fi
}

# Launch all tests in parallel
for model in "${OPENAI_MODELS[@]}"; do
    test_openai_model "$model" &
done

for model in "${ANTHROPIC_MODELS[@]}"; do
    test_anthropic_model "$model" &
done

# Wait for all background jobs
wait

# Collect results
UP_COUNT=0
DOWN_COUNT=0

for model in "${OPENAI_MODELS[@]}"; do
    result=$(cat "$TMPDIR/${model}.txt" 2>/dev/null || echo "? No result")
    echo "Testing $model ... $result"
    if [[ "$result" == *"✅ UP"* ]]; then
        ((UP_COUNT++))
    else
        ((DOWN_COUNT++))
    fi
done

echo ""

for model in "${ANTHROPIC_MODELS[@]}"; do
    result=$(cat "$TMPDIR/${model}.txt" 2>/dev/null || echo "? No result")
    echo "Testing $model ... $result"
    if [[ "$result" == *"✅ UP"* ]]; then
        ((UP_COUNT++))
    else
        ((DOWN_COUNT++))
    fi
done

echo ""
echo "=============================================="
echo "Results: $UP_COUNT up, $DOWN_COUNT down"
echo "=============================================="

if [ $DOWN_COUNT -gt 0 ]; then
    exit 1
fi
exit 0
