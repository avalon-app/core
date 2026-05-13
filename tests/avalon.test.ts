import { Create, UpdateRecentTeamMember, UpdateRecentTeamVote, UpdateResentQuestVote, SetNextLadyOfTheLake, TAvalon, Assassinate } from "../src/avalon"
import { TTeam } from "../src/quest"
import { defaultRuleForNumberOfPlayer, TRule } from "../src/rule"

const createTeamVotes = (count: number, success: boolean): TTeam["votes"] => {
    let maxSuccessCount = success ? Math.floor(count / 2) + 1 : Math.floor(count / 2)
    return Array.from({ length: count }, (_, i) => {
        return { player: i, vote: i < maxSuccessCount }
    })
}
type TStep = {
    member: number[]
    teamVotes: TTeam["votes"]
    questVotes?: boolean[]
}
const runQuest = (game: TAvalon, rule: TRule, step: TStep[]) => {
    step.forEach(({ member, teamVotes, questVotes }) => {
        UpdateRecentTeamMember(game, member)
        UpdateRecentTeamVote(game, rule, teamVotes)
        if (questVotes) {
            UpdateResentQuestVote(game, rule, questVotes)
        }
    })
}

describe("Avalon Game", () => {

    it("should create a new Avalon game", () => {
        const rule = defaultRuleForNumberOfPlayer(7)
        const game = Create(rule)
        expect(game.quests.length).toBe(5)
        expect(game.stage).toBe("team")
        expect(game.players.length).toBe(7)
        expect(game.lancelotSwitch).toBeUndefined()
    })

    it("should update recent team members", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        const members = [0, 1]
        UpdateRecentTeamMember(game, members)
        expect(game.quests[0].teams[0].members).toEqual(members)
    })

    it("should update recent team vote", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        const votes = createTeamVotes(rule.numberOfPlayer, false)
        UpdateRecentTeamMember(game, [0, 1])
        UpdateRecentTeamVote(game, rule, votes)
        expect(game.quests[0].teams[0].votes).toEqual(votes)
        expect(game.stage).toBe("team")
    })

    it("should update recent quest vote", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        const teamVotes = createTeamVotes(rule.numberOfPlayer, true)
        const votes = [true, false]
        UpdateRecentTeamMember(game, [0, 1])
        UpdateRecentTeamVote(game, rule, teamVotes)
        UpdateResentQuestVote(game, rule, votes)
        expect(game.quests[0].result?.votes).toEqual(votes)
        expect(game.quests[0].state).toBe("finished")
    })

    it("should set next Lady of the Lake", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        rule.hasLadyOfTheLake = true
        const game = Create(rule)

        runQuest(game, rule, [{
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, false]
        }, {
            member: [2, 3, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, false, true]
        }])
        const nextLadyOfTheLake = (game.quests[0].teams[0].leader + 1) % rule.numberOfPlayer
        expect(game.stage).toBe("ladyOfTheLake")
        SetNextLadyOfTheLake(game, rule, nextLadyOfTheLake)
        expect(game.quests[1].nextLadyOfTheLake).toBe(nextLadyOfTheLake)
        expect(game.quests[2].ladyOfTheLake).toBe(nextLadyOfTheLake)
        expect(game.stage).toBe("team")
    })

    it("should not change to ladyOfTheLake stage", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)

        runQuest(game, rule, [{
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, false]
        }, {
            member: [2, 3, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, false, true]
        }])
        expect(game.stage).not.toBe("ladyOfTheLake")
        expect(() => SetNextLadyOfTheLake(game, rule, 1)).toThrow()
    })

    it("quest[false, false, false] evil win", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)

        runQuest(game, rule, [{
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [false, false]
        }, {
            member: [2, 3, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [false, false, false]
        }, {
            member: [4, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [false, false]
        }])

        expect(game.result).toBe("evilWin")
        expect(game.stage).toBe("end")
    })

    it("team[false, false, false, false, false] evil win", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)

        runQuest(game, rule, [{
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        },])

        expect(game.result).toBe("evilWin")
        expect(game.stage).toBe("end")
    })

    it("team[false, false, false, false, true] next quest", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)

        runQuest(game, rule, [{
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, false),
        }, {
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, true]
        },])

        expect(game.stage).toBe("team")
    })

    it("should have lancelot", () => {
        const rule = defaultRuleForNumberOfPlayer(7, "rule1")
        const game = Create(rule)
        expect(game.lancelotSwitch).toBeDefined()
        expect(game.players.find(player => player.key === "lancelot_good")).toBeDefined()
        expect(game.players.find(player => player.key === "lancelot_evil")).toBeDefined()
    })

    it("kill merlin, evil should win", () => {
        const rule = defaultRuleForNumberOfPlayer(7, "rule1")
        const game = Create(rule)

        runQuest(game, rule, [{
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, true]
        }, {
            member: [2, 3, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, true, true]
        }, {
            member: [2, 3, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, true, true]
        }])

        const killTarget = game.players.findIndex(i => i.key === "merlin")

        Assassinate(game, killTarget)

        expect(game.result).toBe("evilWin")
        expect(game.stage).toBe("end")
    })

    it("morgana should be assasion ", () => {
        const rule = defaultRuleForNumberOfPlayer(10, "rule1")
        expect(rule.assassin).toBe("morgana")
        const rule1 = defaultRuleForNumberOfPlayer(10)
        expect(rule1.assassin).toBe("assassin")
    })

    it("test lancelet switch", () => {
        const rule = defaultRuleForNumberOfPlayer(7, "rule1")
        const game = Create(rule)

        game.lancelotSwitch = [true, true, false, false, false];

        runQuest(game, rule, [{
            member: [0, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, true]
        }, {
            member: [2, 3, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
            questVotes: [true, true, true]
        }, {
            member: [2, 3, 1],
            teamVotes: createTeamVotes(rule.numberOfPlayer, true),
        }])

        const lancelotGood = game.players.find(player => player.key === "lancelot_good")
        const lancelotEvil = game.players.find(player => player.key === "lancelot_evil")

        expect(lancelotGood?.alignment).toBe("evil")
        expect(lancelotEvil?.alignment).toBe("good")

    })

    it("test lancelet switch rule2", () => {
        const rule = defaultRuleForNumberOfPlayer(7, "rule2")
        const game = Create(rule)

        const lancelotGood = game.players.find(player => player.key === "lancelot_good")
        const lancelotEvil = game.players.find(player => player.key === "lancelot_evil")

        expect(game.lancelotSwitch).toBeDefined()

        if (game.lancelotSwitch![0]) {
            expect(lancelotGood?.alignment).toBe("evil")
            expect(lancelotEvil?.alignment).toBe("good")
        } else {
            expect(lancelotGood?.alignment).toBe("good")
            expect(lancelotEvil?.alignment).toBe("evil")
        }
    })
})