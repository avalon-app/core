/**
 * Generates a new array with the elements of the input array in random order.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} array - The input array to be shuffled.
 * @returns {T[]} A new array with the elements of the input array in random order.
 */
export const randomArray = <T>(array: T[]): T[] => {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

/**
 * Generates a random integer within a specified range.
 *
 * @param min - The minimum value of the range (inclusive).
 * @param max - The maximum value of the range (inclusive).
 * @returns A random integer between `min` and `max` (both inclusive).
 */
export const randomNumberFormRange = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}