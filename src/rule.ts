import { Characters, TCharacterKey } from './character';
import { AvalonError } from './error';
import { randomArray } from './tools';

/**
 * Represents a visibility rule in the game.
 * 
 * @typedef {Object} TVisibilityRule
 * 
 * @property {string} title - The title of the visibility rule.
 * @property {TCharacterKey[]} characters - The characters to whom this rule applies.
 * @property {TCharacterKey[]} canSee - The characters that can be seen by the characters in this rule.
 * @property {TCharacterKey[]} [canSeeCharacter] - Optional property specifying additional characters that can be seen.
 */
type TVisibilityRule = {
    title: string;
    characters: TCharacterKey[];
    canSee: TCharacterKey[];
    canSeeCharacter?: TCharacterKey[];
}

/**
 * Represents the rules for a game.
 */
export type TRule = {
    /**
     * The characters involved in the game.
     */
    readonly characters: TCharacterKey[];

    /**
     * The key of the assassin character.
     */
    readonly assassin: TCharacterKey;

    /**
     * The visibility rules for the characters.
     */
    readonly characterVisibilitiesRules: TVisibilityRule[];

    /**
     * The number of players in the game.
     */
    readonly numberOfPlayer: number;

    /**
     * The quest details for the game.
     */
    readonly quest: {
        /**
         * The configuration for each quest.
         */
        readonly each: {
            /**
             * The number of members required for the quest.
             */
            numberOfMembers: number;

            /**
             * Indicates if two failures are needed.
             */
            needTwoFailure?: true
        }[];

        /**
         * The team configuration for the game.
         */
        readonly team: {
            /**
             * The maximum count of summon teams.
             */
            maxCountOfSummonTeam: number;

            /**
             * The mode of the team configuration.
             */
            mode: "each" | "whole";
        };
    };

    /**
     * Indicates if the Lady of the Lake is present.
     */
    hasLadyOfTheLake?: true;

    /**
     * Indicates if Excalibur is enabled.
     */
    enableExcalibur?: true;

    /**
     * The rule for Lancelot.
     *
     * - `rule1`: Lancelots may switch alignment starting at the third quest, driven by a shuffled card pile
     *   of 2 swaps / 3 no-swaps. One card is revealed for every team proposal from the third quest on
     *   (re-proposals after a rejected vote included); once all 5 cards are revealed there are no more switches.
     * - `rule2`: Lancelots may switch alignment starting at the beginning of the game,
     *   driven by a shuffled pile of 2 swaps / 5 no-swaps (truncated to 5).
     * - `rule3`: Lancelots never switch alignment but can see each other at the start of the game.
     */
    readonly lancelot?: "rule1" | "rule2" | "rule3";
}

/**
 * Generates the shuffled Lancelot switch pile for rule1.
 * The pile contains two `true` (switch) values and three `false` (no switch) values.
 *
 * @returns {boolean[]} The 5 shuffled switch cards.
 */
export const RandomLancelotSwitchForRule1 = () => {
    return randomArray([true, true, false, false, false])
}

/**
 * Generates a random array of boolean values based on a predefined distribution.
 * The array contains 5 elements, randomly selected from the following distribution:
 * - 2 `true` values
 * - 5 `false` values
 *
 * @returns {boolean[]} An array of 5 boolean values.
 */
export const RandomLancelotSwitchForRule2 = () => {
    return randomArray([true, true, false, false, false, false, false]).slice(0, 5)
}

export const isLancelot = (character: TCharacterKey) => {
    return character === "lancelot_good" || character === "lancelot_evil"
}

const characterKeys = new Set<string>(Characters.map(c => c.key))

/**
 * Checks whether a value is a known character key.
 */
export const isCharacterKey = (key: unknown): key is TCharacterKey => {
    return typeof key === "string" && characterKeys.has(key)
}

/**
 * Validates the structural consistency of a rule, so a hand-built rule cannot produce a broken game.
 *
 * @throws {AvalonError} `INVALID_RULE` with a `reason` in `details` when the rule is inconsistent.
 */
export const validateRule = (rule: TRule) => {
    const invalid = (reason: string, details?: Record<string, unknown>) => {
        throw new AvalonError("INVALID_RULE", `Invalid rule: ${reason}`, { reason, ...details })
    }
    const { numberOfPlayer, characters, quest } = rule
    if (!Number.isInteger(numberOfPlayer) || numberOfPlayer < 1) {
        invalid("numberOfPlayer must be a positive integer", { numberOfPlayer })
    }
    if (characters.length !== numberOfPlayer) {
        invalid("characters length must equal numberOfPlayer", { numberOfPlayer, numberOfCharacters: characters.length })
    }
    const unknownCharacters = characters.filter(key => !isCharacterKey(key))
    if (unknownCharacters.length) {
        invalid("characters contain unknown keys", { unknownCharacters })
    }
    if (quest.each.length !== 5) {
        invalid("there must be exactly 5 quests", { numberOfQuests: quest.each.length })
    }
    const invalidQuests = quest.each.flatMap((q, idx) => Number.isInteger(q.numberOfMembers) && q.numberOfMembers >= 1 && q.numberOfMembers <= numberOfPlayer ? [] : [idx])
    if (invalidQuests.length) {
        invalid("quest numberOfMembers must be an integer in [1, numberOfPlayer]", { invalidQuests })
    }
    if (!Number.isInteger(quest.team.maxCountOfSummonTeam) || quest.team.maxCountOfSummonTeam < 1) {
        invalid("maxCountOfSummonTeam must be a positive integer", { maxCountOfSummonTeam: quest.team.maxCountOfSummonTeam })
    }
}
/**
 * The default visibility rules for the characters.
 * These rules are used to determine which characters can see each other.
 */
const defaultVisibilityRules: TVisibilityRule[] = [{
    title: "可看到的坏人",
    characters: ["merlin"],
    canSee: ["morgana", "minion", "assassin", "oberon", "lancelot_evil"]
}, {
    title: "梅林/莫甘娜",
    characters: ["percival"],
    canSee: ["merlin", "morgana"]
}, {
    title: "可看到的队友",
    characters: ["morgana", "assassin", "mordred", "minion"],
    canSee: ["morgana", "assassin", "mordred", "minion", "lancelot_evil"],
    canSeeCharacter: ["lancelot_evil"]
}]

/**
 * The visibility rule for Lancelot.
 * This rule allows Lancelot to see other Lancelot characters.
 */
const lancelotVisibilityRule: TVisibilityRule = {
    title: "可看到的彼此",
    characters: ["lancelot_good", "lancelot_evil"],
    canSee: ["lancelot_good", "lancelot_evil"]
}

/**
 * Creates a default rule for a specified number of players.
 * 
 * @param {number} numberOfPlayer - The number of players in the game.
 * @param {TRule["lancelot"]} lancelotRule - The rule for Lancelot.
 * @returns {TRule} The default rule for the specified number of players.
 */
export const defaultRuleForNumberOfPlayer = (numberOfPlayer: number, lancelotRule?: TRule["lancelot"]) => {
    if (lancelotRule && !["rule1", "rule2", "rule3"].includes(lancelotRule)) {
        throw new AvalonError("INVALID_LANCELOT_RULE", "Invalid lancelot rule", { lancelotRule })
    }
    const rule = innerRules.find(item => item.numberOfPlayer === numberOfPlayer && (lancelotRule ? item.hasLancelot : !item.hasLancelot))
    if (!rule) {
        throw new AvalonError(
            "NO_RULE_FOR_PLAYER_COUNT",
            `No rule found for numberOfPlayer:${numberOfPlayer} lancelotRule:${lancelotRule}`,
            { numberOfPlayer, lancelotRule }
        )
    }
    const visibilityRules = lancelotRule === "rule3" ? [...defaultVisibilityRules, lancelotVisibilityRule] : defaultVisibilityRules
    /// Every nested array/object is copied so that mutating a returned rule never leaks into the shared presets.
    const result: TRule = {
        assassin: rule.assassinate || "assassin",
        characters: [...rule.characters],
        numberOfPlayer,
        lancelot: lancelotRule,
        characterVisibilitiesRules: visibilityRules.map(cloneVisibilityRule),
        quest: {
            team: {
                maxCountOfSummonTeam: 5,
                mode: "each"
            },
            each: rule.quests.map(q => ({ ...q }))
        }
    }
    return result
}

const cloneVisibilityRule = (rule: TVisibilityRule): TVisibilityRule => ({
    ...rule,
    characters: [...rule.characters],
    canSee: [...rule.canSee],
    ...(rule.canSeeCharacter ? { canSeeCharacter: [...rule.canSeeCharacter] } : {})
})

type TInnerRule = {
    numberOfPlayer: number;
    hasLancelot?: true;
    characters: TCharacterKey[];
    assassinate?: TCharacterKey;
    quests: { numberOfMembers: number, needTwoFailure?: true }[];
}
/**
 * The inner rules for the game.
 * These rules are used to determine the characters and quests for each game.
 * The rules are based on the number of players in the game.
 */
const innerRules: TInnerRule[] = [{
    numberOfPlayer: 5,
    characters: ["merlin", "percival", "loyalServant", "morgana", "assassin"],
    quests: [
        { numberOfMembers: 2 },
        { numberOfMembers: 3 },
        { numberOfMembers: 2 },
        { numberOfMembers: 3 },
        { numberOfMembers: 3 }
    ]
}, {
    numberOfPlayer: 6,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "morgana", "assassin"],
    quests: [
        { numberOfMembers: 2 },
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 3 },
        { numberOfMembers: 4 }
    ]
}, {
    numberOfPlayer: 7,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "morgana", "assassin", "oberon"],
    quests: [
        { numberOfMembers: 2 },
        { numberOfMembers: 3 },
        { numberOfMembers: 3 },
        { numberOfMembers: 4, needTwoFailure: true },
        { numberOfMembers: 4 }
    ]
}, {
    numberOfPlayer: 7,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "lancelot_good", "morgana", "assassin", "lancelot_evil"],
    quests: [
        { numberOfMembers: 2 },
        { numberOfMembers: 3 },
        { numberOfMembers: 3 },
        { numberOfMembers: 4, needTwoFailure: true },
        { numberOfMembers: 4 }
    ]
}, {
    numberOfPlayer: 8,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "morgana", "assassin", "minion"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5, needTwoFailure: true },
        { numberOfMembers: 5 }
    ]
}, {
    numberOfPlayer: 8,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "lancelot_good", "morgana", "assassin", "lancelot_evil"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5, needTwoFailure: true },
        { numberOfMembers: 5 }
    ]
}, {
    numberOfPlayer: 9,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "mordred", "morgana", "assassin"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5, needTwoFailure: true },
        { numberOfMembers: 5 }
    ]
}, {
    numberOfPlayer: 9,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "morgana", "assassin", "lancelot_evil"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5, needTwoFailure: true },
        { numberOfMembers: 5 }
    ]
}, {
    numberOfPlayer: 10,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "mordred", "morgana", "assassin", "oberon"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5, needTwoFailure: true },
        { numberOfMembers: 5 }
    ]
}, {
    numberOfPlayer: 10,
    hasLancelot: true,
    assassinate: "morgana",
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "mordred", "morgana", "lancelot_evil", "oberon"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5, needTwoFailure: true },
        { numberOfMembers: 5 }
    ]
}, {
    numberOfPlayer: 11,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "mordred", "morgana", "lancelot_evil", "assassin"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5 },
        { numberOfMembers: 6, needTwoFailure: true },
        { numberOfMembers: 6 }
    ]
}, {
    numberOfPlayer: 12,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "mordred", "morgana", "lancelot_evil", "oberon", "assassin"],
    quests: [
        { numberOfMembers: 3 },
        { numberOfMembers: 4 },
        { numberOfMembers: 5 },
        { numberOfMembers: 6, needTwoFailure: true },
        { numberOfMembers: 6 }
    ]
}]

/**
 * Gets the number of players that are supported.
 * @param hasLancelot Indicates if Lancelot is present.
 * @returns The number of players that are supported.
 */
export const SupportNumberOfPlayer = (hasLancelot: boolean = false) => {
    return innerRules.filter(i => !i.hasLancelot === !hasLancelot).map(i => i.numberOfPlayer)
}