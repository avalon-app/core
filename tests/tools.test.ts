import { randomArray, randomNumberFormRange } from '../src/tools';

describe('randomArray', () => {
    it('should return an array with the same elements but in random order', () => {
        const input = [1, 2, 3, 4, 5];
        const result = randomArray(input);

        expect(result).toHaveLength(input.length);
        expect(result).toEqual(expect.arrayContaining(input));
        expect(result).not.toEqual(input); // This test might fail occasionally due to randomness
    });

    it('should return an empty array when input is empty', () => {
        const input: number[] = [];
        const result = randomArray(input);

        expect(result).toHaveLength(0);
    });

    it('should handle an array with one element', () => {
        const input = [1];
        const result = randomArray(input);

        expect(result).toHaveLength(1);
        expect(result).toEqual(input);
    });

    it('should handle an array with duplicate elements', () => {
        const input = [1, 2, 2, 3];
        const result = randomArray(input);

        expect(result).toHaveLength(input.length);
        expect(result).toEqual(expect.arrayContaining(input));
    });
});

describe('randomNumberFormRange', () => {
    it('should return a number within the specified range', () => {
        const min = 1;
        const max = 10;
        const result = randomNumberFormRange(min, max);

        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
    });

    it('should return the same number when min and max are equal', () => {
        const min = 5;
        const max = 5;
        const result = randomNumberFormRange(min, max);

        expect(result).toBe(min);
    });

    it('should handle negative ranges', () => {
        const min = -10;
        const max = -1;
        const result = randomNumberFormRange(min, max);

        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
    });

    it('should handle a range that includes zero', () => {
        const min = -5;
        const max = 5;
        const result = randomNumberFormRange(min, max);

        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
    });
});