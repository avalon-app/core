import { CharacterKey } from './character';
import { AvalonError } from './error';
import { DraftState, previousSeat, startTeamBuilding } from './internal';
import { defaultRandom, randomInt, shuffle } from './random';
import { Rule, validateRule } from './rule';
import { CreateGameOptions, GameState, STATE_VERSION } from './types';

const RULE1_DECK = [true, true, false, false, false]
const RULE2_DECK = [true, true, false, false, false, false, false]

const isPermutationOf = (candidate: readonly unknown[], characters: readonly CharacterKey[]) => {
    if (!Array.isArray(candidate) || candidate.length !== characters.length) {
        return false
    }
    const sortedCandidate = candidate.map(String).sort()
    const sortedCharacters = [...characters].sort()
    return sortedCandidate.every((key, i) => key === sortedCharacters[i])
}

/**
 * Starts a new game: validates the rule, deals the characters, picks the first leader, shuffles the Lancelot deck
 * and opens the first quest. The rule is copied into the state, so later changes to it have no effect.
 *
 * @throws {AvalonError} `INVALID_RULE`, `INVALID_CHARACTERS` or `INVALID_FIRST_LEADER`.
 */
export const createGame = (rule: Rule, options: CreateGameOptions = {}): GameState => {
    validateRule(rule)
    const numberOfPlayers = rule.numberOfPlayers
    const random = options.random ?? defaultRandom

    const { firstLeader } = options
    if (firstLeader !== undefined && !(Number.isInteger(firstLeader) && firstLeader >= 0 && firstLeader < numberOfPlayers)) {
        throw new AvalonError("INVALID_FIRST_LEADER", "The first leader must be a seat in [0, numberOfPlayers)", { firstLeader, numberOfPlayers })
    }
    if (options.characters !== undefined && !isPermutationOf(options.characters, rule.characters)) {
        throw new AvalonError("INVALID_CHARACTERS", "The dealt characters must be a permutation of rule.characters", {
            characters: options.characters, expected: rule.characters
        })
    }

    const characters = options.characters ? [...options.characters] : shuffle(rule.characters, random)
    const leader = firstLeader ?? randomInt(numberOfPlayers, random)
    const lancelotCards = rule.lancelot === "rule1" ? shuffle(RULE1_DECK, random)
        : rule.lancelot === "rule2" ? shuffle(RULE2_DECK, random).slice(0, 5)
            : undefined

    const draft: DraftState = {
        version: STATE_VERSION,
        rule: JSON.parse(JSON.stringify(rule)),
        characters,
        stage: "teamBuilding",
        leader,
        quests: rule.quests.map(({ teamSize, failsRequired }) => ({ teamSize, failsRequired, status: "pending", teams: [] })),
        ...(lancelotCards ? { lancelotDeck: { cards: lancelotCards, revealed: 0 } } : {}),
        // The Lady of the Lake starts with the player to the right of the first leader.
        ...(rule.ladyOfTheLake ? { ladyOfTheLake: { holder: previousSeat(leader, numberOfPlayers), uses: [] } } : {}),
    }
    startTeamBuilding(draft, 0, true)
    return draft
}
