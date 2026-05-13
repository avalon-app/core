import { randomArray } from '../src/tools';
test('random array', () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const resultMap: number[][] = []
    const testCount = 10000
    for (let i = 0; i < testCount; i++) {
        const result = randomArray(arr)
        result.map((item, idx) => {
            if (!resultMap[idx]) {
                resultMap[idx] = []
            }

            resultMap[idx][item] = (resultMap[idx][item] || 0) + 1
        })
    }
    const resultDisplay = resultMap.map(item => {
        return item.map((count) => {
            return (count / testCount * 100).toFixed(2) + '%'
        })
    })

    console.table(resultDisplay)
});