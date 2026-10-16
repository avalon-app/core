import { CHARACTERS, CharacterKey, isCharacterKey, UNIQUE_CHARACTERS } from './character';
import { AvalonError } from './error';

/**
 * How the Lancelots behave.
 *
 * - `rule1`: a shuffled pile of 5 cards (2 switch / 3 no-switch). From the third quest on, one card is revealed
 *   every time a team-building phase starts — re-proposals after a rejected vote included. Each revealed switch
 *   card swaps the two Lancelots' alignments. Once all 5 cards are revealed there are no more switches.
 * - `rule2`: a shuffled pile of 7 cards (2 switch / 5 no-switch) truncated to 5. One card is revealed at the start
 *   of every quest, starting with the first.
 * - `rule3`: the Lancelots never switch, but see each other at the start of the game.
 */
export type LancelotVariant = "rule1" | "rule2" | "rule3"

export const LANCELOT_VARIANTS: readonly LancelotVariant[] = ["rule1", "rule2", "rule3"]

/**
 * The configuration of one quest.
 */
export type QuestConfig = {
    /** Number of players on the team. */
    readonly teamSize: number
    /** Number of fail cards needed for the quest to fail (2 for the 4th quest with 7+ players). */
    readonly failsRequired: number
}

/**
 * How many team proposals may be made before evil wins.
 *
 * - `scope: "quest"`: per quest — the classic rule is 5 (the 5th rejected proposal in a quest makes evil win).
 * - `scope: "game"`: across the whole game.
 */
export type TeamProposalLimit = {
    readonly scope: "quest" | "game"
    readonly max: number
}

/**
 * Describes what some characters learn about others at the start of the game.
 * A viewer never sees themselves through a visibility rule.
 */
export type VisibilityRule = {
    /** Stable identifier, e.g. for localising the hint shown to the viewer. */
    readonly id: string
    /** Characters who receive this information. */
    readonly viewers: readonly CharacterKey[]
    /** Characters the viewers see (without learning which character they are). */
    readonly visible: readonly CharacterKey[]
    /** Characters among `visible` whose exact character the viewers also learn. */
    readonly revealCharacter?: readonly CharacterKey[]
}

/**
 * The complete, self-contained configuration of a game. A game keeps its own copy in `GameState.rule`.
 */
export type Rule = {
    readonly numberOfPlayers: number
    /** The characters in play — public information. `createGame` deals them to the seats. */
    readonly characters: readonly CharacterKey[]
    /** The evil character who performs the assassination. */
    readonly assassin: CharacterKey
    /** Exactly 5 quests. */
    readonly quests: readonly QuestConfig[]
    readonly teamProposalLimit: TeamProposalLimit
    readonly ladyOfTheLake: boolean
    readonly excalibur: boolean
    readonly lancelot?: LancelotVariant
    /**
     * When true, the assassin may assassinate at any point before the game ends, not only after good wins
     * three quests. Hitting Merlin makes evil win; missing makes good win.
     */
    readonly allowEarlyAssassination: boolean
    readonly visibility: readonly VisibilityRule[]
}

/**
 * Optional modules for `createRule`.
 */
export type RuleOptions = {
    readonly lancelot?: LancelotVariant
    readonly ladyOfTheLake?: boolean
    readonly excalibur?: boolean
    readonly allowEarlyAssassination?: boolean
}

type Preset = {
    readonly numberOfPlayers: number
    readonly lancelot: boolean
    readonly characters: readonly CharacterKey[]
    readonly assassin?: CharacterKey
    readonly quests: readonly (readonly [teamSize: number, failsRequired: number])[]
}

const QUESTS_5 = [[2, 1], [3, 1], [2, 1], [3, 1], [3, 1]] as const
const QUESTS_6 = [[2, 1], [3, 1], [4, 1], [3, 1], [4, 1]] as const
const QUESTS_7 = [[2, 1], [3, 1], [3, 1], [4, 2], [4, 1]] as const
const QUESTS_8_TO_10 = [[3, 1], [4, 1], [4, 1], [5, 2], [5, 1]] as const
const QUESTS_11_TO_12 = [[3, 1], [4, 1], [5, 1], [6, 2], [6, 1]] as const

const PRESETS: readonly Preset[] = [
    { numberOfPlayers: 5, lancelot: false, quests: QUESTS_5, characters: ["merlin", "percival", "loyalServant", "morgana", "assassin"] },
    { numberOfPlayers: 6, lancelot: false, quests: QUESTS_6, characters: ["merlin", "percival", "loyalServant", "loyalServant", "morgana", "assassin"] },
    { numberOfPlayers: 7, lancelot: false, quests: QUESTS_7, characters: ["merlin", "percival", "loyalServant", "loyalServant", "morgana", "assassin", "oberon"] },
    { numberOfPlayers: 7, lancelot: true, quests: QUESTS_7, characters: ["merlin", "percival", "loyalServant", "lancelotGood", "morgana", "assassin", "lancelotEvil"] },
    { numberOfPlayers: 8, lancelot: false, quests: QUESTS_8_TO_10, characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "morgana", "assassin", "minion"] },
    { numberOfPlayers: 8, lancelot: true, quests: QUESTS_8_TO_10, characters: ["merlin", "percival", "loyalServant", "loyalServant", "lancelotGood", "morgana", "assassin", "lancelotEvil"] },
    { numberOfPlayers: 9, lancelot: false, quests: QUESTS_8_TO_10, characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "mordred", "morgana", "assassin"] },
    { numberOfPlayers: 9, lancelot: true, quests: QUESTS_8_TO_10, characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "lancelotGood", "morgana", "assassin", "lancelotEvil"] },
    { numberOfPlayers: 10, lancelot: false, quests: QUESTS_8_TO_10, characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "mordred", "morgana", "assassin", "oberon"] },
    { numberOfPlayers: 10, lancelot: true, quests: QUESTS_8_TO_10, assassin: "morgana", characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "lancelotGood", "mordred", "morgana", "lancelotEvil", "oberon"] },
    { numberOfPlayers: 11, lancelot: true, quests: QUESTS_11_TO_12, characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "lancelotGood", "mordred", "morgana", "lancelotEvil", "assassin"] },
    { numberOfPlayers: 12, lancelot: true, quests: QUESTS_11_TO_12, characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "lancelotGood", "mordred", "morgana", "lancelotEvil", "oberon", "assassin"] },
]

const DEFAULT_VISIBILITY: readonly VisibilityRule[] = [{
    id: "merlinSeesEvil",
    viewers: ["merlin"],
    visible: ["morgana", "minion", "assassin", "oberon", "lancelotEvil"],
}, {
    id: "percivalSeesMerlinAndMorgana",
    viewers: ["percival"],
    visible: ["merlin", "morgana"],
}, {
    id: "evilSeesEvil",
    viewers: ["morgana", "assassin", "mordred", "minion"],
    visible: ["morgana", "assassin", "mordred", "minion", "lancelotEvil"],
    revealCharacter: ["lancelotEvil"],
}]

const LANCELOTS_SEE_EACH_OTHER: VisibilityRule = {
    id: "lancelotsSeeEachOther",
    viewers: ["lancelotGood", "lancelotEvil"],
    visible: ["lancelotGood", "lancelotEvil"],
}

const cloneVisibilityRule = (rule: VisibilityRule): VisibilityRule => ({
    id: rule.id,
    viewers: [...rule.viewers],
    visible: [...rule.visible],
    ...(rule.revealCharacter ? { revealCharacter: [...rule.revealCharacter] } : {}),
})

/**
 * Lists the player counts that have a built-in preset.
 */
export const getSupportedPlayerCounts = (options: { readonly lancelot?: boolean } = {}): number[] => {
    return PRESETS.filter(p => p.lancelot === !!options.lancelot).map(p => p.numberOfPlayers)
}

/**
 * Builds the standard rule for a player count, with optional modules. The result is a fresh object;
 * customise it with spreads, e.g. `{ ...createRule(7), teamProposalLimit: { scope: "game", max: 15 } }`.
 *
 * @throws {AvalonError} `INVALID_RULE` for an unknown Lancelot variant, `UNSUPPORTED_PLAYER_COUNT` when no preset exists.
 */
export const createRule = (numberOfPlayers: number, options: RuleOptions = {}): Rule => {
    const { lancelot } = options
    if (lancelot !== undefined && !LANCELOT_VARIANTS.includes(lancelot)) {
        throw new AvalonError("INVALID_RULE", "Invalid rule: unknown Lancelot variant", { reason: "unknownLancelotVariant", lancelot })
    }
    const preset = PRESETS.find(p => p.numberOfPlayers === numberOfPlayers && p.lancelot === (lancelot !== undefined))
    if (!preset) {
        throw new AvalonError("UNSUPPORTED_PLAYER_COUNT", `No preset for ${numberOfPlayers} players${lancelot ? " with Lancelot" : ""}`, { numberOfPlayers, lancelot })
    }
    const visibility = lancelot === "rule3" ? [...DEFAULT_VISIBILITY, LANCELOTS_SEE_EACH_OTHER] : DEFAULT_VISIBILITY
    return {
        numberOfPlayers,
        characters: [...preset.characters],
        assassin: preset.assassin ?? "assassin",
        quests: preset.quests.map(([teamSize, failsRequired]) => ({ teamSize, failsRequired })),
        teamProposalLimit: { scope: "quest", max: 5 },
        ladyOfTheLake: !!options.ladyOfTheLake,
        excalibur: !!options.excalibur,
        ...(lancelot ? { lancelot } : {}),
        allowEarlyAssassination: !!options.allowEarlyAssassination,
        visibility: visibility.map(cloneVisibilityRule),
    }
}

/**
 * Checks that a (possibly hand-built) rule is internally consistent.
 *
 * @throws {AvalonError} `INVALID_RULE` with `details.reason` naming the first problem found.
 */
export const validateRule = (rule: Rule): void => {
    const invalid = (reason: string, message: string, details?: Record<string, unknown>): never => {
        throw new AvalonError("INVALID_RULE", `Invalid rule: ${message}`, { reason, ...details })
    }
    const { numberOfPlayers, characters, quests, teamProposalLimit } = rule

    if (!Number.isInteger(numberOfPlayers) || numberOfPlayers < 2) {
        invalid("numberOfPlayers", "numberOfPlayers must be an integer of at least 2", { numberOfPlayers })
    }
    if (!Array.isArray(characters) || characters.length !== numberOfPlayers) {
        invalid("characterCount", "there must be exactly one character per player", { numberOfPlayers, characters })
    }
    const unknownCharacters = characters.filter(key => !isCharacterKey(key))
    if (unknownCharacters.length) {
        invalid("unknownCharacter", "characters contain unknown keys", { unknownCharacters })
    }
    const duplicated = UNIQUE_CHARACTERS.filter(key => characters.filter(c => c === key).length > 1)
    if (duplicated.length) {
        invalid("duplicateCharacter", "unique characters appear more than once", { duplicated })
    }
    if (!characters.includes(rule.assassin) || !isCharacterKey(rule.assassin) || CHARACTERS[rule.assassin].alignment !== "evil") {
        invalid("assassin", "the assassin must be an evil character in play", { assassin: rule.assassin })
    }
    if (!Array.isArray(quests) || quests.length !== 5) {
        invalid("questCount", "there must be exactly 5 quests", { quests })
    }
    quests.forEach((quest, index) => {
        if (!Number.isInteger(quest.teamSize) || quest.teamSize < 1 || quest.teamSize > numberOfPlayers) {
            invalid("teamSize", "quest teamSize must be an integer in [1, numberOfPlayers]", { index, teamSize: quest.teamSize })
        }
        if (!Number.isInteger(quest.failsRequired) || quest.failsRequired < 1 || quest.failsRequired > quest.teamSize) {
            invalid("failsRequired", "quest failsRequired must be an integer in [1, teamSize]", { index, failsRequired: quest.failsRequired })
        }
        if (rule.excalibur && quest.teamSize < 2) {
            invalid("excaliburTeamSize", "Excalibur needs every team to have at least 2 members", { index, teamSize: quest.teamSize })
        }
    })
    if (!teamProposalLimit || !["quest", "game"].includes(teamProposalLimit.scope) || !Number.isInteger(teamProposalLimit.max) || teamProposalLimit.max < 1) {
        invalid("teamProposalLimit", "teamProposalLimit needs scope \"quest\" or \"game\" and a positive integer max", { teamProposalLimit })
    }
    if (rule.lancelot !== undefined) {
        if (!LANCELOT_VARIANTS.includes(rule.lancelot)) {
            invalid("unknownLancelotVariant", "unknown Lancelot variant", { lancelot: rule.lancelot })
        }
        if (!characters.includes("lancelotGood") || !characters.includes("lancelotEvil")) {
            invalid("lancelotCharacters", "Lancelot rules need both lancelotGood and lancelotEvil in play")
        }
    }
    const ids = new Set<string>()
    for (const visibilityRule of rule.visibility) {
        if (typeof visibilityRule.id !== "string" || ids.has(visibilityRule.id)) {
            invalid("visibilityId", "visibility rule ids must be unique strings", { id: visibilityRule.id })
        }
        ids.add(visibilityRule.id)
        const keys = [...visibilityRule.viewers, ...visibilityRule.visible, ...(visibilityRule.revealCharacter ?? [])]
        if (!keys.every(isCharacterKey)) {
            invalid("visibilityCharacter", "visibility rules contain unknown characters", { id: visibilityRule.id })
        }
    }
}
