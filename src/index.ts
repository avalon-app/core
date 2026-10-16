// Configuration
export { CHARACTERS, isCharacterKey } from "./character"
export type { Alignment, CharacterKey } from "./character"
export { createRule, getSupportedPlayerCounts, validateRule } from "./rule"
export type { LancelotVariant, QuestConfig, Rule, RuleOptions, TeamProposalLimit, VisibilityRule } from "./rule"

// Game lifecycle
export { createGame } from "./game"
export { applyAction } from "./actions"
export { STATE_VERSION } from "./types"
export type {
    CreateGameOptions, GameAction, GameActionType, GameResult, GameState, LadyOfTheLakeState, LadyOfTheLakeUse,
    LancelotDeck, PendingAction, Quest, QuestCard, QuestResult, QuestStatus, Stage, Team, WinReason
} from "./types"

// Queries
export {
    areLancelotsSwitched, getAlignment, getAssassinSeat, getCurrentQuest, getCurrentQuestIndex, getCurrentTeam,
    getPendingActions, getScore, getSeatsOf
} from "./selectors"
export { getPlayerView } from "./view"
export type { KnownPlayer, LadyOfTheLakeUseView, PlayerView, QuestView, TeamView } from "./view"

// Errors
export { AvalonError, isAvalonError } from "./error"
export type { AvalonErrorCode } from "./error"
