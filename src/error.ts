export type TAvalonErrorCode =
    | "INVALID_LANCELOT_RULE"
    | "NO_RULE_FOR_PLAYER_COUNT"
    | "INVALID_LANCELOT_CONFIG"
    | "INVALID_FIRST_LEADER"
    | "INVALID_LEADER"
    | "INVALID_STAGE"
    | "NO_QUEST_IN_PROGRESS"
    | "NO_TEAM_IN_PROGRESS"
    | "NO_RECENT_TEAM"
    | "NO_LAST_FINISHED_QUEST"
    | "CANNOT_CREATE_NEW_TEAM"
    | "INVALID_TEAM_MEMBER_COUNT"
    | "INVALID_TEAM_MEMBER"
    | "INVALID_VOTE_COUNT"
    | "INVALID_VOTER"
    | "DUPLICATE_VOTER"
    | "INVALID_LADY_OF_THE_LAKE"
    | "LADY_OF_THE_LAKE_ALREADY_HELD"
    | "EXCALIBUR_DISABLED"
    | "EXCALIBUR_NOT_TEAM_MEMBER"
    | "EXCALIBUR_IS_LEADER"
    | "INVALID_ASSASSINATION_TARGET"
    | "MISSING_LANCELOT_SWITCH";

export class AvalonError extends Error {
    readonly code: TAvalonErrorCode;
    readonly details?: Record<string, unknown>;
    constructor(code: TAvalonErrorCode, message: string, details?: Record<string, unknown>) {
        super(message);
        this.name = "AvalonError";
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, AvalonError.prototype);
    }
}
