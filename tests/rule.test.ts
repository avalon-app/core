import { defaultRuleForNumberOfPlayer, SupportNumberOfPlayer, TRule } from '../src/rule';

describe('defaultRuleForNumberOfPlayer', () => {
    it('should return the correct rule for 5 players', () => {
        const expectedRule: TRule = {
            characters: ["merlin", "percival", "loyalServant", "morgana", "assassin"],
            numberOfPlayer: 5,
            assassin: "assassin",
            characterVisibilitiesRules: [{
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
            }],
            quest: {
                team: {
                    maxCountOfSummonTeam: 5,
                    mode: "each"
                },
                each: [
                    { numberOfMembers: 2 },
                    { numberOfMembers: 3 },
                    { numberOfMembers: 2 },
                    { numberOfMembers: 3 },
                    { numberOfMembers: 3 }
                ]
            }
        };
        expect(defaultRuleForNumberOfPlayer(5)).toEqual(expectedRule);
    });

    it('should return the correct rule for 7 players', () => {
        const expectedRule: TRule = {
            characters: ["merlin", "percival", "loyalServant", "loyalServant", "morgana", "assassin", "oberon"],
            numberOfPlayer: 7,
            assassin: "assassin",
            characterVisibilitiesRules: [{
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
            }],
            quest: {
                team: {
                    maxCountOfSummonTeam: 5,
                    mode: "each"
                },
                each: [
                    { numberOfMembers: 2 },
                    { numberOfMembers: 3 },
                    { numberOfMembers: 3 },
                    { numberOfMembers: 4, needTwoFailure: true },
                    { numberOfMembers: 4 }
                ]
            }
        };
        expect(defaultRuleForNumberOfPlayer(7)).toEqual(expectedRule);
    });

    it('should return an independent copy so mutating one rule never pollutes later presets', () => {
        const first = defaultRuleForNumberOfPlayer(7, "rule3")
        first.characters[0] = "minion"
        first.quest.each[0].numberOfMembers = 99
        first.characterVisibilitiesRules[0].canSee.push("mordred")
        first.characterVisibilitiesRules[2].canSeeCharacter!.push("oberon")
        first.characterVisibilitiesRules[3].characters.pop()

        const second = defaultRuleForNumberOfPlayer(7, "rule3")
        expect(second.characters[0]).toBe("merlin")
        expect(second.quest.each[0].numberOfMembers).toBe(2)
        expect(second.characterVisibilitiesRules[0].canSee).not.toContain("mordred")
        expect(second.characterVisibilitiesRules[2].canSeeCharacter).toEqual(["lancelot_evil"])
        expect(second.characterVisibilitiesRules[3].characters).toEqual(["lancelot_good", "lancelot_evil"])
        expect(defaultRuleForNumberOfPlayer(8).characterVisibilitiesRules[0].canSee).not.toContain("mordred")
    });

    it('should throw undefined for an unsupported number of players', () => {
        expect(() => {
            defaultRuleForNumberOfPlayer(4)
        }).toThrow()
    });

    it('should return support ', () => {
        const support = SupportNumberOfPlayer()
        expect(support).toEqual([5, 6, 7, 8, 9, 10])
        const lancelotSupport = SupportNumberOfPlayer(true)
        expect(lancelotSupport).toEqual([7, 8, 9, 10, 11, 12])
    })
});