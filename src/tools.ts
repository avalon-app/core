/**
 * Generates a new array with the elements of the input array in random order.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} array - The input array to be shuffled.
 * @returns {T[]} A new array with the elements of the input array in random order.
 */
export const randomArray = <T extends any = any>(array: T[]): T[] => {
    let candidate = [...array];
    const itemCount = array.length;

    return array.map((_, index) => {
        const random = Math.floor(Math.random() * (itemCount - index));
        const value = candidate[random];
        candidate = candidate.filter((_, i) => i !== random)
        return value
    });
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