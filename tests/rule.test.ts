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
                    { numberOfMebers: 2 },
                    { numberOfMebers: 3 },
                    { numberOfMebers: 2 },
                    { numberOfMebers: 3 },
                    { numberOfMebers: 3 }
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
                    { numberOfMebers: 2 },
                    { numberOfMebers: 3 },
                    { numberOfMebers: 3 },
                    { numberOfMebers: 4, needTwoFailure: true },
                    { numberOfMebers: 4 }
                ]
            }
        };
        expect(defaultRuleForNumberOfPlayer(7)).toEqual(expectedRule);
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