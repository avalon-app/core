import { Alignment, CHARACTERS, CharacterKey, isLancelot } from './character';
import { assertSeat } from './internal';
import { GameState, PendingAction, Quest, Team } from './types';

/**
 * Index of the quest being played, or -1 between quests (Lady of the Lake), during the assassination or after the game.
 */
export const getCurrentQuestIndex = (state: GameState): number => {
    return state.quests.findIndex(quest => quest.status === "active")
}

/**
 * The quest being played, if any.
 */
export const getCurrentQuest = (state: GameState): Quest | undefined => {
    return state.quests.find(quest => quest.status === "active")
}

/**
 * The team being voted on or carrying out the quest. Undefined while the leader is still choosing.
 */
export const getCurrentTeam = (state: GameState): Team | undefined => {
    if (state.stage !== "teamVote" && state.stage !== "quest" && state.stage !== "excalibur") {
        return undefined
    }
    const quest = getCurrentQuest(state)
    return quest ? quest.teams[quest.teams.length - 1] : undefined
}

/**
 * Number of quests won by each side so far.
 */
export const getScore = (state: GameState) => ({
    succeeded: state.quests.filter(quest => quest.status === "succeeded").length,
    failed: state.quests.filter(quest => quest.status === "failed").length,
})

/**
 * Whether the Lancelots' alignments are currently swapped.
 */
export const areLancelotsSwitched = (state: GameState): boolean => {
    const deck = state.lancelotDeck
    if (!deck) {
        return false
    }
    return deck.cards.slice(0, deck.revealed).filter(Boolean).length % 2 === 1
}

/**
 * The current alignment of a seat, taking Lancelot switches into account.
 *
 * @throws {AvalonError} `INVALID_PLAYER` for an invalid seat.
 */
export const getAlignment = (state: GameState, seat: number): Alignment => {
    assertSeat(state, seat)
    const character = state.characters[seat]
    const alignment = CHARACTERS[character].alignment
    if (isLancelot(character) && areLancelotsSwitched(state)) {
        return alignment === "good" ? "evil" : "good"
    }
    return alignment
}

/**
 * The seats holding a character (several for loyal servants or minions).
 */
export const getSeatsOf = (state: GameState, character: CharacterKey): number[] => {
    return state.characters.flatMap((c, seat) => c === character ? [seat] : [])
}

/**
 * The seat of the assassin, if the assassin character is in play.
 */
export const getAssassinSeat = (state: GameState): number | undefined => {
    const seat = state.characters.indexOf(state.rule.assassin)
    return seat === -1 ? undefined : seat
}

/**
 * What the game is waiting for, and who may do it. Empty once the game has ended.
 *
 * With `rule.allowEarlyAssassination`, an `assassinate` entry for the assassin is listed in every stage —
 * this reveals the assassin, so never send the result of this function to players (`getPlayerView` filters it).
 */
export const getPendingActions = (state: GameState): PendingAction[] => {
    const pending: PendingAction[] = []
    const quest = getCurrentQuest(state)
    const team = getCurrentTeam(state)
    const assassin = getAssassinSeat(state)
    switch (state.stage) {
        case "teamBuilding":
            pending.push({ type: "proposeTeam", players: [state.leader] })
            break
        case "teamVote":
            if (team) {
                pending.push({ type: "voteTeam", players: team.votes.flatMap((vote, seat) => vote === null ? [seat] : []) })
            }
            break
        case "quest":
            if (team && quest) {
                const played = new Set((quest.pendingCards ?? []).map(card => card.player))
                pending.push({ type: "playQuestCard", players: team.members.filter(member => !played.has(member)) })
            }
            break
        case "excalibur":
            if (team && team.excaliburHolder !== undefined) {
                pending.push({ type: "useExcalibur", players: [team.excaliburHolder] })
            }
            break
        case "ladyOfTheLake":
            if (state.ladyOfTheLake) {
                pending.push({ type: "useLadyOfTheLake", players: [state.ladyOfTheLake.holder] })
            }
            break
        case "assassination":
            if (assassin !== undefined) {
                pending.push({ type: "assassinate", players: [assassin] })
            }
            break
        case "ended":
            return pending
    }
    if (state.stage !== "assassination" && state.rule.allowEarlyAssassination && assassin !== undefined && state.characters.includes("merlin")) {
        pending.push({ type: "assassinate", players: [assassin] })
    }
    return pending
}
