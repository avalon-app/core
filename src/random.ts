/**
 * A source of uniformly distributed numbers in `[0, 1)`, like `Math.random`.
 * Inject a seeded one for reproducible games (tests, replays).
 */
export type RandomSource = () => number

const hasCrypto = () => typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"

/**
 * Uses the Web Crypto API when available, which is unpredictable to players; falls back to `Math.random`.
 */
export const defaultRandom: RandomSource = () => {
    if (!hasCrypto()) {
        return Math.random()
    }
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] / 2 ** 32
}

/**
 * Returns a random integer in `[0, maxExclusive)`.
 */
export const randomInt = (maxExclusive: number, random: RandomSource) => {
    return Math.floor(random() * maxExclusive)
}

/**
 * Returns a new array with the items in random order (Fisher–Yates). The input is not modified.
 */
export const shuffle = <T>(items: readonly T[], random: RandomSource): T[] => {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInt(i + 1, random)
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}
