import { TCharacterKey } from './character';
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
            numberOfMebers: number;

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
     */
    readonly lancelot?: "rule1" | "rule2" | "rule3";
}

/**
 * Generates a random boolean value based on a predefined array.
 * The array contains two `true` values and three `false` values.
 * 
 * @returns {boolean} A randomly selected boolean value from the array.
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
        throw new Error("error lancelot rule")
    }
    const rule = innerRules.find(item => item.numberOfPlayer === numberOfPlayer && (lancelotRule ? item.hasLancelot : !item.hasLancelot))
    if (!rule) {
        throw new Error(`no suit rule for numberOfPlayer:${numberOfPlayer} lancelotRule:${lancelotRule}`)
    }
    const result: TRule = {
        assassin: rule.assassinate || "assassin",
        characters: rule.characters,
        numberOfPlayer,
        lancelot: lancelotRule,
        characterVisibilitiesRules: lancelotRule === "rule3" ? [...defaultVisibilityRules, lancelotVisibilityRule] : defaultVisibilityRules,
        quest: {
            team: {
                maxCountOfSummonTeam: 5,
                mode: "each"
            },
            each: rule.quests
        }
    }
    return result
}

type TInnerRule = {
    numberOfPlayer: number;
    hasLancelot?: true;
    characters: TCharacterKey[];
    assassinate?: TCharacterKey;
    quests: { numberOfMebers: number, needTwoFailure?: true }[];
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
        { numberOfMebers: 2 },
        { numberOfMebers: 3 },
        { numberOfMebers: 2 },
        { numberOfMebers: 3 },
        { numberOfMebers: 3 }
    ]
}, {
    numberOfPlayer: 6,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "morgana", "assassin"],
    quests: [
        { numberOfMebers: 2 },
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 3 },
        { numberOfMebers: 4 }
    ]
}, {
    numberOfPlayer: 7,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "morgana", "assassin", "oberon"],
    quests: [
        { numberOfMebers: 2 },
        { numberOfMebers: 3 },
        { numberOfMebers: 3 },
        { numberOfMebers: 4, needTwoFailure: true },
        { numberOfMebers: 4 }
    ]
}, {
    numberOfPlayer: 7,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "lancelot_good", "morgana", "assassin", "lancelot_evil"],
    quests: [
        { numberOfMebers: 2 },
        { numberOfMebers: 3 },
        { numberOfMebers: 3 },
        { numberOfMebers: 4, needTwoFailure: true },
        { numberOfMebers: 4 }
    ]
}, {
    numberOfPlayer: 8,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "morgana", "assassin", "minion"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5, needTwoFailure: true },
        { numberOfMebers: 5 }
    ]
}, {
    numberOfPlayer: 8,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "lancelot_good", "morgana", "assassin", "lancelot_evil"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5, needTwoFailure: true },
        { numberOfMebers: 5 }
    ]
}, {
    numberOfPlayer: 9,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "mordred", "morgana", "assassin"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5, needTwoFailure: true },
        { numberOfMebers: 5 }
    ]
}, {
    numberOfPlayer: 9,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "morgana", "assassin", "lancelot_evil"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5, needTwoFailure: true },
        { numberOfMebers: 5 }
    ]
}, {
    numberOfPlayer: 10,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "mordred", "morgana", "assassin", "oberon"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5, needTwoFailure: true },
        { numberOfMebers: 5 }
    ]
}, {
    numberOfPlayer: 10,
    hasLancelot: true,
    assassinate: "morgana",
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "mordred", "morgana", "lancelot_evil", "oberon"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5, needTwoFailure: true },
        { numberOfMebers: 5 }
    ]
}, {
    numberOfPlayer: 11,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "mordred", "morgana", "lancelot_evil", "assassin"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5 },
        { numberOfMebers: 6, needTwoFailure: true },
        { numberOfMebers: 6 }
    ]
}, {
    numberOfPlayer: 12,
    hasLancelot: true,
    characters: ["merlin", "percival", "loyalServant", "loyalServant", "loyalServant", "loyalServant", "lancelot_good", "mordred", "morgana", "lancelot_evil", "oberon", "assassin"],
    quests: [
        { numberOfMebers: 3 },
        { numberOfMebers: 4 },
        { numberOfMebers: 5 },
        { numberOfMebers: 6, needTwoFailure: true },
        { numberOfMebers: 6 }
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