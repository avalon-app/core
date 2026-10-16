import { applyAction, AvalonErrorCode, createGame, GameState, getCurrentTeam, isAvalonError, Rule } from "../src"

/**
 * A small seeded PRNG (mulberry32) for reproducible games.
 */
export const seededRandom = (seed: number) => () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const expectAvalonError = (fn: () => unknown, code: AvalonErrorCode) => {
    let caught: unknown
    try {
        fn()
    } catch (error) {
        caught = error
    }
    expect(isAvalonError(caught)).toBe(true)
    expect((caught as { code: string }).code).toBe(code)
}

/**
 * A game where seat `i` holds `rule.characters[i]` and seat `firstLeader` leads first.
 * For the 5-player preset: 0 merlin, 1 percival, 2 loyalServant, 3 morgana, 4 assassin.
 */
export const setup = (rule: Rule, firstLeader = 0) => createGame(rule, { characters: rule.characters, firstLeader })

export const propose = (state: GameState, members: number[], excaliburHolder?: number) =>
    applyAction(state, { type: "proposeTeam", player: state.leader, members, ...(excaliburHolder !== undefined ? { excaliburHolder } : {}) })

export const voteAll = (state: GameState, approve: boolean) =>
    state.characters.reduce((next, _, player) => applyAction(next, { type: "voteTeam", player, approve }), state)

/** Every member of the current team plays a card; the seats in `fails` play fail. */
export const playCards = (state: GameState, fails: number[] = []) =>
    getCurrentTeam(state)!.members.reduce((next, player) => applyAction(next, { type: "playQuestCard", player, success: !fails.includes(player) }), state)

/** Proposes `members`, approves the team and plays the cards. */
export const runQuest = (state: GameState, members: number[], fails: number[] = [], excaliburHolder?: number) =>
    playCards(voteAll(propose(state, members, excaliburHolder), true), fails)

/** Proposes `members` and rejects the team. */
export const rejectTeam = (state: GameState, members: number[]) => voteAll(propose(state, members), false)
