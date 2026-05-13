import { Characters } from "../src/character"
import { defaultRuleForNumberOfPlayer } from "../src/rule"

describe('Test character set', () => {
    const supportCharacterKeys = Characters.map(c => c.key);
    it.each([5, 6, 7, 8, 9, 10])('test rule character for %i', (numberOfPlayer: number) => {
        const rule = defaultRuleForNumberOfPlayer(numberOfPlayer)
        expect(rule).not.toBeUndefined()
        const characters = rule?.characters || []
        expect(characters.length).toEqual(numberOfPlayer)
        expect(supportCharacterKeys).toEqual(expect.arrayContaining(characters))
    })
})