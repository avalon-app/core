/**
 * The side a character plays for.
 */
export type Alignment = "good" | "evil"

/**
 * Every character supported by the engine, keyed by its stable identifier, with its starting alignment.
 * Lancelots may switch alignment during the game (see `Rule.lancelot`); use `getAlignment` for the current one.
 */
export const CHARACTERS = {
    merlin: { alignment: "good" },
    percival: { alignment: "good" },
    loyalServant: { alignment: "good" },
    lancelotGood: { alignment: "good" },
    morgana: { alignment: "evil" },
    assassin: { alignment: "evil" },
    oberon: { alignment: "evil" },
    mordred: { alignment: "evil" },
    minion: { alignment: "evil" },
    lancelotEvil: { alignment: "evil" },
} as const satisfies Record<string, { readonly alignment: Alignment }>

/**
 * The identifier of a character.
 */
export type CharacterKey = keyof typeof CHARACTERS

/**
 * Characters that may appear at most once in a game. The others (loyal servants, minions) may repeat.
 */
export const UNIQUE_CHARACTERS: readonly CharacterKey[] = [
    "merlin", "percival", "lancelotGood", "morgana", "assassin", "oberon", "mordred", "lancelotEvil"
]

/**
 * Checks whether a value is a known character key.
 */
export const isCharacterKey = (value: unknown): value is CharacterKey => {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(CHARACTERS, value)
}

/**
 * Checks whether a character is one of the two Lancelots.
 */
export const isLancelot = (character: CharacterKey) => {
    return character === "lancelotGood" || character === "lancelotEvil"
}
