import { randomArray } from '../src/tools';
test('random array is uniformly distributed', () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const resultMap: number[][] = arr.map(() => arr.map(() => 0))
    const testCount = 10000
    for (let i = 0; i < testCount; i++) {
        randomArray(arr).forEach((item, idx) => {
            resultMap[idx][item]++
        })
    }
    // Each item should land on each position ~10% of the time; ±2.5% is > 8σ, so this never flakes.
    const expected = 1 / arr.length
    resultMap.forEach(position => position.forEach(count => {
        expect(Math.abs(count / testCount - expected)).toBeLessThan(0.025)
    }))
});
