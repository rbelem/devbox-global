# goose-slim — recipe dispatch aliases
# Source from ~/.bashrc after goose is set up.

# ── recipes (mirrors oh-my-opencode-slim value preset) ──────────────
export GOOSE_PROVIDER=openai
export OPENAI_HOST=http://localhost:20128
export OPENAI_BASE_PATH=/v1
export OPENAI_API_KEY=omniroute-local

# explorer — read-only, fast, mimo-v2.5
alias go-explorer='GOOSE_MODEL=opencode-go/mimo-v2.5 \
  goose run --recipe ~/.config/goose/recipes/explorer.yaml --text'

# oracle — deep reasoning, kimi-k3
alias go-oracle='GOOSE_MODEL=moonshotai/kimi-k3 \
  goose run --recipe ~/.config/goose/recipes/oracle.yaml --text'

# fixer — code implementation, kimi-k2.7-code-highspeed
alias go-fixer='GOOSE_MODEL=moonshotai/kimi-k2.7-code-highspeed \
  goose run --recipe ~/.config/goose/recipes/fixer.yaml --text'

# librarian — research, mimo-v2.5
alias go-librarian='GOOSE_MODEL=opencode-go/mimo-v2.5 \
  goose run --recipe ~/.config/goose/recipes/librarian.yaml --text'

# autolearn-reviewer — session review, MiniMax-M3 variant=max
alias go-autolearn='GOOSE_MODEL=minimax/MiniMax-M3 \
  goose run --recipe ~/.config/goose/recipes/autolearn-reviewer.yaml --text'

# ── defaults ─────────────────────────────────────────────────────────
alias go='goose run --text'                              # default GOOSE_MODEL
alias go-chat='goose session'                            # interactive chat
alias go-config='goose configure'                        # interactive config
alias go-recipes='ls ~/.config/goose/recipes/'           # list recipes
