/**
 * Stable, programmatic error codes. Match on these rather than on error messages.
 */
export type AvalonErrorCode =
    // Configuration
    | "INVALID_RULE"
    | "UNSUPPORTED_PLAYER_COUNT"
    | "INVALID_CHARACTERS"
    | "INVALID_FIRST_LEADER"
    // State and actions
    | "INVALID_STATE"
    | "UNKNOWN_ACTION"
    | "INVALID_STAGE"
    | "INVALID_PLAYER"
    | "PLAYER_CANNOT_ACT"
    | "ALREADY_ACTED"
    | "INVALID_VOTE"
    // Team proposal
    | "INVALID_TEAM_SIZE"
    | "INVALID_TEAM_MEMBER"
    | "DUPLICATE_TEAM_MEMBER"
    // Quest
    | "GOOD_MUST_SUCCEED"
    // Excalibur
    | "EXCALIBUR_DISABLED"
    | "EXCALIBUR_HOLDER_REQUIRED"
    | "INVALID_EXCALIBUR_HOLDER"
    | "INVALID_EXCALIBUR_TARGET"
    // Lady of the Lake
    | "INVALID_LADY_OF_THE_LAKE_TARGET"
    // Assassination
    | "INVALID_ASSASSINATION_TARGET"

/**
 * The only error type thrown by the engine for invalid input or illegal moves.
 */
export class AvalonError extends Error {
    readonly code: AvalonErrorCode
    readonly details?: Record<string, unknown>

    constructor(code: AvalonErrorCode, message: string, details?: Record<string, unknown>) {
        super(message)
        this.name = "AvalonError"
        this.code = code
        this.details = details
        Object.setPrototypeOf(this, AvalonError.prototype)
    }
}

/**
 * Type guard for `AvalonError` that also works when the package is loaded twice
 * (e.g. both its CommonJS and ESM builds), where `instanceof` would fail.
 */
export const isAvalonError = (error: unknown): error is AvalonError => {
    return error instanceof AvalonError || (
        error instanceof Error && error.name === "AvalonError" && typeof (error as { code?: unknown }).code === "string"
    )
}
