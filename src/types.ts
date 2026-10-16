import { Alignment, CharacterKey } from './character';
import { Rule } from './rule';

/**
 * Bumped whenever the shape of `GameState` changes incompatibly, so persisted games can be detected and migrated.
 */
export const STATE_VERSION = 2

/**
 * The phase the game is in, i.e. which action it is waiting for.
 *
 * - `teamBuilding`: the leader proposes a team (`proposeTeam`).
 * - `teamVote`: every player votes on the proposed team (`voteTeam`).
 * - `quest`: every team member plays a quest card (`playQuestCard`).
 * - `excalibur`: the Excalibur holder decides whether to switch a card (`useExcalibur`).
 * - `ladyOfTheLake`: the Lady of the Lake holder examines a player (`useLadyOfTheLake`).
 * - `assassination`: good won three quests; the assassin names Merlin (`assassinate`).
 * - `ended`: see `GameState.result`.
 */
export type Stage = "teamBuilding" | "teamVote" | "quest" | "excalibur" | "ladyOfTheLake" | "assassination" | "ended"

/**
 * A proposed team and the vote on it.
 */
export type Team = {
    readonly leader: number
    readonly members: readonly number[]
    readonly excaliburHolder?: number
    /** One entry per seat: `true` approve, `false` reject, `null` not voted yet. Secret until the vote resolves. */
    readonly votes: readonly (boolean | null)[]
    /** Set once every player has voted. */
    readonly approved?: boolean
}

/**
 * A quest card played by a team member. Only kept until the quest resolves, then anonymised.
 */
export type QuestCard = {
    readonly player: number
    readonly success: boolean
}

export type QuestStatus = "pending" | "active" | "succeeded" | "failed"

export type QuestResult = {
    readonly success: boolean
    readonly failCount: number
    /** The revealed cards without seats, successes first, after any Excalibur switch. */
    readonly cards: readonly boolean[]
    /** Present when the Excalibur holder switched a card. */
    readonly excalibur?: {
        readonly target: number
        /** The target's card before it was switched — known only to the Excalibur holder. */
        readonly originalCard: boolean
    }
}

export type Quest = {
    readonly teamSize: number
    readonly failsRequired: number
    readonly status: QuestStatus
    /** Every team proposed for this quest, in order. The last one is the current or approved team. */
    readonly teams: readonly Team[]
    /** Cards played so far by the approved team (secret). Removed once the quest resolves. */
    readonly pendingCards?: readonly QuestCard[]
    readonly result?: QuestResult
}

export type LadyOfTheLakeUse = {
    /** Index of the quest after which the Lady of the Lake was used. */
    readonly afterQuest: number
    readonly holder: number
    readonly target: number
    /** The target's alignment at the time — known only to the holder. */
    readonly alignment: Alignment
}

export type LadyOfTheLakeState = {
    /** The current holder, who will examine a player after the next eligible quest. */
    readonly holder: number
    readonly uses: readonly LadyOfTheLakeUse[]
}

export type LancelotDeck = {
    /** The shuffled pile; `true` switches the Lancelots' alignments. Unrevealed cards are secret. */
    readonly cards: readonly boolean[]
    /** How many cards from the top have been revealed. */
    readonly revealed: number
}

export type WinReason =
    | "threeQuestsFailed"
    | "teamProposalLimitReached"
    | "merlinAssassinated"
    | "assassinationMissed"
    /** Good won three quests and there is nobody to assassinate (no Merlin in play). */
    | "threeQuestsSucceeded"

export type GameResult = {
    readonly winner: Alignment
    readonly reason: WinReason
}

/**
 * The complete, serialisable state of a game. It contains secret information (characters, unrevealed cards,
 * pending votes), so keep it on the server and send each player `getPlayerView(state, seat)` instead.
 * Treat it as immutable: `applyAction` always returns a new state.
 */
export type GameState = {
    readonly version: typeof STATE_VERSION
    readonly rule: Rule
    /** The character dealt to each seat. */
    readonly characters: readonly CharacterKey[]
    readonly stage: Stage
    /** The current leader. */
    readonly leader: number
    readonly quests: readonly Quest[]
    readonly lancelotDeck?: LancelotDeck
    readonly ladyOfTheLake?: LadyOfTheLakeState
    readonly assassination?: {
        readonly assassin: number
        readonly target: number
    }
    readonly result?: GameResult
}

/**
 * A move made by a player. `player` is the seat making the move; the engine checks they are allowed to.
 */
export type GameAction =
    | { readonly type: "proposeTeam"; readonly player: number; readonly members: readonly number[]; readonly excaliburHolder?: number }
    | { readonly type: "voteTeam"; readonly player: number; readonly approve: boolean }
    | { readonly type: "playQuestCard"; readonly player: number; readonly success: boolean }
    /** `target: null` declines to use Excalibur. */
    | { readonly type: "useExcalibur"; readonly player: number; readonly target: number | null }
    | { readonly type: "useLadyOfTheLake"; readonly player: number; readonly target: number }
    | { readonly type: "assassinate"; readonly player: number; readonly target: number }

export type GameActionType = GameAction["type"]

/**
 * An action the game is waiting for, and the seats that may perform it.
 */
export type PendingAction = {
    readonly type: GameActionType
    readonly players: readonly number[]
}

/**
 * Options for `createGame`.
 */
export type CreateGameOptions = {
    /** Seat-by-seat deal; must be a permutation of `rule.characters`. Random when omitted. */
    readonly characters?: readonly CharacterKey[]
    /** The first leader's seat. Random when omitted. */
    readonly firstLeader?: number
    /** Random source for dealing, the first leader and the Lancelot deck. Defaults to Web Crypto. */
    readonly random?: () => number
}
