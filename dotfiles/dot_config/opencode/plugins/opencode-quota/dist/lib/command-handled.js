/**
 * Command-handled sentinel.
 *
 * Thrown by slash-command handlers to signal that the command output
 * has already been injected and no further processing is needed.
 */
export const COMMAND_HANDLED_SENTINEL = "__QUOTA_COMMAND_HANDLED__";
const COMMAND_HANDLED_ERROR_BRAND = Symbol.for("@slkiser/opencode-quota/command-handled");
function createCommandHandledError() {
    const err = Object.create(Error.prototype);
    Object.defineProperties(err, {
        [COMMAND_HANDLED_ERROR_BRAND]: { value: true },
        message: { value: "", configurable: true, writable: true },
        name: { value: "", configurable: true, writable: true },
        stack: { value: "", configurable: true, writable: true },
    });
    return err;
}
/**
 * Throw a quiet command-handled abort error.
 * Use this instead of `throw new Error("__QUOTA_COMMAND_HANDLED__")`.
 */
export function handled() {
    throw createCommandHandledError();
}
/**
 * Returns true when an error is a command-handled abort.
 */
export function isCommandHandledError(err) {
    if (!(err instanceof Error)) {
        return false;
    }
    const marker = err[COMMAND_HANDLED_ERROR_BRAND];
    return marker === true || err.message === COMMAND_HANDLED_SENTINEL;
}
//# sourceMappingURL=command-handled.js.map