import { Alignment } from './character';
import { AvalonError } from './error';
import { GameState, STATE_VERSION, WinReason } from './types';

/**
 * A deeply mutable copy of a readonly type, used for the private working copy inside the engine.
 */
export type Draft<T> = T extends readonly (infer U)[] ? Draft<U>[] : T extends object ? { -readonly [K in keyof T]: Draft<T[K]> } : T

export type DraftState = Draft<GameState>

/**
 * Deep-copies the (JSON-serialisable) state so a transition can work on it and simply be discarded if it throws.
 */
export const cloneState = (state: GameState): DraftState => JSON.parse(JSON.stringify(state))

export const assertState = (state: GameState) => {
    if (!state || typeof state !== "object" || state.version !== STATE_VERSION) {
        throw new AvalonError("INVALID_STATE", `Expected a game state of version ${STATE_VERSION}`, {
            version: (state as { version?: unknown } | undefined)?.version
        })
    }
}

export const isSeat = (state: GameState, seat: unknown): seat is number => {
    return typeof seat === "number" && Number.isInteger(seat) && seat >= 0 && seat < state.characters.length
}

// A function declaration, as TypeScript requires for assertion signatures.
export function assertSeat(state: GameState, seat: unknown): asserts seat is number {
    if (!isSeat(state, seat)) {
        throw new AvalonError("INVALID_PLAYER", "Invalid player seat", { player: seat, numberOfPlayers: state.characters.length })
    }
}

export const nextSeat = (seat: number, numberOfPlayers: number) => (seat + 1) % numberOfPlayers

export const previousSeat = (seat: number, numberOfPlayers: number) => (seat + numberOfPlayers - 1) % numberOfPlayers

/**
 * Whether no further team may be proposed for the given quest.
 */
export const isTeamProposalLimitReached = (state: GameState, questIndex: number) => {
    const { scope, max } = state.rule.teamProposalLimit
    const proposals = scope === "quest"
        ? state.quests[questIndex].teams.length
        : state.quests.reduce((total, quest) => total + quest.teams.length, 0)
    return proposals >= max
}

const revealLancelotCard = (draft: DraftState) => {
    const deck = draft.lancelotDeck
    if (deck && deck.revealed < deck.cards.length) {
        deck.revealed++
    }
}

/**
 * Enters the team-building phase of the given quest, revealing a Lancelot card when the variant asks for one.
 *
 * @param newQuest - true when the quest starts; false for a re-proposal after a rejected vote.
 */
export const startTeamBuilding = (draft: DraftState, questIndex: number, newQuest: boolean) => {
    if (newQuest) {
        draft.quests[questIndex].status = "active"
    }
    draft.stage = "teamBuilding"
    const variant = draft.rule.lancelot
    if ((variant === "rule1" && questIndex >= 2) || (variant === "rule2" && newQuest)) {
        revealLancelotCard(draft)
    }
}

export const endGame = (draft: DraftState, winner: Alignment, reason: WinReason) => {
    draft.stage = "ended"
    draft.result = { winner, reason }
    // Cards of an interrupted quest are never revealed.
    draft.quests.forEach(quest => { delete quest.pendingCards })
}

/**
 * Whether an assassination is meaningful: Merlin and the assassin are both in play.
 */
export const canAssassinate = (state: GameState) => {
    return state.characters.includes("merlin") && state.characters.includes(state.rule.assassin)
}

/**
 * Moves on after a quest resolved: ends the game, enters the assassination or Lady of the Lake phase,
 * or starts the next quest.
 */
export const afterQuestResolved = (draft: DraftState, questIndex: number) => {
    const succeeded = draft.quests.filter(quest => quest.status === "succeeded").length
    const failed = draft.quests.filter(quest => quest.status === "failed").length
    if (failed >= 3) {
        return endGame(draft, "evil", "threeQuestsFailed")
    }
    if (succeeded >= 3) {
        if (canAssassinate(draft)) {
            draft.stage = "assassination"
            return
        }
        return endGame(draft, "good", "threeQuestsSucceeded")
    }
    if (isTeamProposalLimitReached(draft, questIndex + 1)) {
        return endGame(draft, "evil", "teamProposalLimitReached")
    }
    if (draft.ladyOfTheLake && questIndex >= 1) {
        draft.stage = "ladyOfTheLake"
        return
    }
    beginNextQuest(draft, questIndex + 1)
}

/**
 * Passes the leadership clockwise and starts the given quest.
 */
export const beginNextQuest = (draft: DraftState, questIndex: number) => {
    draft.leader = nextSeat(draft.leader, draft.characters.length)
    startTeamBuilding(draft, questIndex, true)
}
