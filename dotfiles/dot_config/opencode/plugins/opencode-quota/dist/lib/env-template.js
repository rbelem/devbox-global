/**
 * Environment variable template resolution.
 *
 * Supports {env:VAR_NAME} syntax for referencing environment variables in config values.
 */
/**
 * Resolve {env:VAR_NAME} syntax in a string value.
 *
 * If the value matches the pattern `{env:VAR_NAME}`, looks up the environment
 * variable and returns its trimmed value. Returns null if the env var is
 * not set or is empty/whitespace-only.
 *
 * If the value does not match the pattern, returns the original value unchanged.
 *
 * @param value - The string value to resolve
 * @param allowedEnvVars - Optional allowlist for env vars referenced by templates
 * @returns The resolved value, or null if env var is missing/empty/disallowed
 *
 * @example
 * // With OPENAI_API_KEY="sk-123" in environment:
 * resolveEnvTemplate("{env:OPENAI_API_KEY}") // => "sk-123"
 * resolveEnvTemplate("{env:MISSING_VAR}")    // => null
 * resolveEnvTemplate("literal-value")        // => "literal-value"
 */
export function resolveEnvTemplate(value, allowedEnvVars) {
    const match = value.match(/^\{env:([^}]+)\}$/);
    if (!match)
        return value;
    const envVar = match[1];
    if (allowedEnvVars && !allowedEnvVars.includes(envVar)) {
        return null;
    }
    const envValue = process.env[envVar];
    return envValue && envValue.trim().length > 0 ? envValue.trim() : null;
}
//# sourceMappingURL=env-template.js.map