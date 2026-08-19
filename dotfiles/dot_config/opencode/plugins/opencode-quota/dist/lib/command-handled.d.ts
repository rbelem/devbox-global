/**
 * Command-handled sentinel.
 *
 * Thrown by slash-command handlers to signal that the command output
 * has already been injected and no further processing is needed.
 */
export declare const COMMAND_HANDLED_SENTINEL: "__QUOTA_COMMAND_HANDLED__";
/**
 * Throw a quiet command-handled abort error.
 * Use this instead of `throw new Error("__QUOTA_COMMAND_HANDLED__")`.
 */
export declare function handled(): never;
/**
 * Returns true when an error is a command-handled abort.
 */
export declare function isCommandHandledError(err: unknown): boolean;
//# sourceMappingURL=command-handled.d.ts.map