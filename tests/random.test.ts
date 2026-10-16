import { defaultRandom, randomInt, shuffle } from "../src/random"
import { seededRandom } from "./helpers"

describe("shuffle", () => {
    it("is uniformly distributed", () => {
        const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        const counts = items.map(() => items.map(() => 0))
        const runs = 10000
        const random = seededRandom(42)
        for (let i = 0; i < runs; i++) {
            shuffle(items, random).forEach((item, position) => { counts[position][item]++ })
        }
        // Each item should land on each position ~10% of the time; ±2.5% is > 8σ, so this never flakes.
        counts.forEach(position => position.forEach(count => {
            expect(Math.abs(count / runs - 1 / items.length)).toBeLessThan(0.025)
        }))
    })

    it("keeps the same items and does not modify the input", () => {
        const input = [1, 2, 2, 3]
        const result = shuffle(input, defaultRandom)
        expect([...result].sort()).toEqual([1, 2, 2, 3])
        expect(input).toEqual([1, 2, 2, 3])
    })

    it("follows Fisher-Yates for a given random source", () => {
        // With random() === 0 every step swaps the current tail with index 0.
        expect(shuffle([1, 2, 3, 4, 5], () => 0)).toEqual([2, 3, 4, 5, 1])
    })
})

describe("random sources", () => {
    it("defaultRandom returns numbers in [0, 1)", () => {
        for (let i = 0; i < 1000; i++) {
            const value = defaultRandom()
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThan(1)
        }
    })

    it("defaultRandom falls back to Math.random without Web Crypto", () => {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto")!
        Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true })
        const spy = jest.spyOn(Math, "random").mockReturnValue(0.25)
        try {
            expect(defaultRandom()).toBe(0.25)
        } finally {
            spy.mockRestore()
            Object.defineProperty(globalThis, "crypto", descriptor)
        }
    })

    it("randomInt stays in [0, max)", () => {
        expect(randomInt(5, () => 0)).toBe(0)
        expect(randomInt(5, () => 0.9999999)).toBe(4)
    })
})
