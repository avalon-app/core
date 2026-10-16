import {
    Assassinate, ChangeToAssassinate, Create, SetExcalibur, SetNextLadyOfTheLake, UpdateRecentQuestVote,
    UpdateRecentTeamMember, UpdateRecentTeamVote
} from "../src/avalon"
import { TCharacterKey } from "../src/character"
import { AvalonError, TAvalonErrorCode } from "../src/error"
import { CreateNextTeam, CreateQuests, TTeam } from "../src/quest"
import { defaultRuleForNumberOfPlayer, TRule } from "../src/rule"

const expectAvalonError = (fn: () => unknown, code: TAvalonErrorCode) => {
    let caught: unknown
    try { fn() } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(AvalonError)
    expect((caught as AvalonError).code).toBe(code)
    expect((caught as AvalonError).name).toBe("AvalonError")
    expect(typeof (caught as AvalonError).message).toBe("string")
}

const teamVotes = (count: number, success: boolean): TTeam["votes"] =>
    Array.from({ length: count }, (_, i) => ({ player: i, vote: i < (success ? Math.floor(count / 2) + 1 : Math.floor(count / 2)) }))

describe("AvalonError contract", () => {
    it("AvalonError carries code, message, and optional details", () => {
        const err = new AvalonError("INVALID_STAGE", "msg", { foo: 1 })
        expect(err).toBeInstanceOf(Error)
        expect(err).toBeInstanceOf(AvalonError)
        expect(err.code).toBe("INVALID_STAGE")
        expect(err.message).toBe("msg")
        expect(err.details).toEqual({ foo: 1 })
    })
})

describe("error codes from rule.ts", () => {
    it("INVALID_LANCELOT_RULE", () => {
        expectAvalonError(() => defaultRuleForNumberOfPlayer(7, "bogus" as unknown as TRule["lancelot"]), "INVALID_LANCELOT_RULE")
    })
    it("NO_RULE_FOR_PLAYER_COUNT", () => {
        expectAvalonError(() => defaultRuleForNumberOfPlayer(99), "NO_RULE_FOR_PLAYER_COUNT")
    })
})

describe("error codes from quest.ts", () => {
    it("INVALID_LEADER", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        expectAvalonError(() => CreateQuests(rule, -1), "INVALID_LEADER")
        expectAvalonError(() => CreateQuests(rule, rule.numberOfPlayer), "INVALID_LEADER")
    })
    it("CANNOT_CREATE_NEW_TEAM (whole mode exhausted)", () => {
        const base = defaultRuleForNumberOfPlayer(5)
        const rule: TRule = { ...base, quest: { ...base.quest, team: { ...base.quest.team, mode: "whole", maxCountOfSummonTeam: 1 } } }
        const game = Create(rule)
        expectAvalonError(() => CreateNextTeam(game.quests, rule), "CANNOT_CREATE_NEW_TEAM")
    })
    it("NO_QUEST_IN_PROGRESS (quest.ts CreateNextTeam)", () => {
        const base = defaultRuleForNumberOfPlayer(5)
        const rule: TRule = { ...base, quest: { ...base.quest, team: { ...base.quest.team, mode: "whole", maxCountOfSummonTeam: 99 } } }
        const game = Create(rule)
        game.quests.forEach(q => { q.state = "finished" })
        expectAvalonError(() => CreateNextTeam(game.quests, rule), "NO_QUEST_IN_PROGRESS")
    })
    it("NO_TEAM_IN_PROGRESS (quest.ts CreateNextTeam)", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        game.quests[0].teams = []
        expectAvalonError(() => CreateNextTeam(game.quests, rule), "NO_TEAM_IN_PROGRESS")
    })
})

describe("error codes from avalon.ts Create", () => {
    it("INVALID_LANCELOT_CONFIG (bad value)", () => {
        const rule = defaultRuleForNumberOfPlayer(7)
        expectAvalonError(() => Create({ ...rule, lancelot: "bogus" as unknown as TRule["lancelot"] }), "INVALID_LANCELOT_CONFIG")
    })
    it("INVALID_LANCELOT_CONFIG (too few players)", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        expectAvalonError(() => Create({ ...rule, lancelot: "rule1" }), "INVALID_LANCELOT_CONFIG")
    })
    it("INVALID_FIRST_LEADER", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        expectAvalonError(() => Create(rule, undefined, -1), "INVALID_FIRST_LEADER")
        expectAvalonError(() => Create(rule, undefined, rule.numberOfPlayer), "INVALID_FIRST_LEADER")
        expectAvalonError(() => Create(rule, undefined, 1.5), "INVALID_FIRST_LEADER")
    })
    it("INVALID_RULE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        expectAvalonError(() => Create({ ...rule, characters: rule.characters.slice(1) }), "INVALID_RULE")
        expectAvalonError(() => Create({ ...rule, characters: [...rule.characters.slice(1), "bogus" as TCharacterKey] }), "INVALID_RULE")
        expectAvalonError(() => Create({ ...rule, quest: { ...rule.quest, each: rule.quest.each.slice(1) } }), "INVALID_RULE")
        expectAvalonError(() => Create({ ...rule, quest: { ...rule.quest, each: rule.quest.each.map(q => ({ ...q, numberOfMembers: 6 })) } }), "INVALID_RULE")
        expectAvalonError(() => Create({ ...rule, quest: { ...rule.quest, team: { ...rule.quest.team, maxCountOfSummonTeam: 0 } } }), "INVALID_RULE")
    })
    it("INVALID_CUSTOM_CHARACTERS", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        expectAvalonError(() => Create(rule, ["merlin", "percival", "loyalServant", "morgana"]), "INVALID_CUSTOM_CHARACTERS")
        expectAvalonError(() => Create(rule, []), "INVALID_CUSTOM_CHARACTERS")
        expectAvalonError(() => Create(rule, ["merlin", "percival", "loyalServant", "morgana", "bogus" as TCharacterKey]), "INVALID_CUSTOM_CHARACTERS")
    })
})

describe("error codes from UpdateRecentTeamMember", () => {
    it("INVALID_STAGE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        ChangeToAssassinate(game)
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, 1]), "INVALID_STAGE")
    })
    it("INVALID_TEAM_MEMBER_COUNT", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        expectAvalonError(() => UpdateRecentTeamMember(game, [0]), "INVALID_TEAM_MEMBER_COUNT")
    })
    it("INVALID_TEAM_MEMBER", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, 99]), "INVALID_TEAM_MEMBER")
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, -1]), "INVALID_TEAM_MEMBER")
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, 0.5]), "INVALID_TEAM_MEMBER")
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, NaN]), "INVALID_TEAM_MEMBER")
        expect(game.quests[0].teams[0].members).toEqual([])
    })
    it("DUPLICATE_TEAM_MEMBER", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, 0]), "DUPLICATE_TEAM_MEMBER")
        expect(game.quests[0].teams[0].members).toEqual([])
    })
})

describe("error codes from UpdateRecentTeamVote", () => {
    it("INVALID_STAGE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        ChangeToAssassinate(game)
        expectAvalonError(() => UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true)), "INVALID_STAGE")
    })
    it("TEAM_NOT_PROPOSED", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        expectAvalonError(() => UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true)), "TEAM_NOT_PROPOSED")
        expect(game.stage).toBe("team")
        expect(game.quests[0].teams[0].votes).toEqual([])
    })
    it("INVALID_VOTE_COUNT", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        expectAvalonError(() => UpdateRecentTeamVote(game, rule, [{ player: 0, vote: true }]), "INVALID_VOTE_COUNT")
    })
    it("INVALID_VOTER", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        const votes: TTeam["votes"] = [
            { player: 0, vote: true }, { player: 1, vote: true }, { player: 2, vote: true },
            { player: 3, vote: true }, { player: 99, vote: true }
        ]
        expectAvalonError(() => UpdateRecentTeamVote(game, rule, votes), "INVALID_VOTER")
    })
    it("DUPLICATE_VOTER", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        const votes: TTeam["votes"] = [
            { player: 0, vote: true }, { player: 0, vote: true }, { player: 2, vote: true },
            { player: 3, vote: true }, { player: 4, vote: true }
        ]
        expectAvalonError(() => UpdateRecentTeamVote(game, rule, votes), "DUPLICATE_VOTER")
    })
    it("INVALID_VOTE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        const votes = teamVotes(rule.numberOfPlayer, true).map((v, i) => i === 0 ? { ...v, vote: "false" as unknown as boolean } : v)
        expectAvalonError(() => UpdateRecentTeamVote(game, rule, votes), "INVALID_VOTE")
        expect(game.stage).toBe("team")
    })
})

describe("error codes from UpdateRecentQuestVote", () => {
    it("INVALID_STAGE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true, true]), "INVALID_STAGE")
    })
    it("INVALID_VOTE_COUNT", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true]), "INVALID_VOTE_COUNT")
    })
    it("INVALID_VOTE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true, "false" as unknown as boolean]), "INVALID_VOTE")
        expect(game.stage).toBe("quest")
        expect(game.quests[0].state).toBe("inProgress")
    })
})

describe("error codes from UpdateRecentQuestVote (Excalibur and per-player votes)", () => {
    const approvedTeam = (enableExcalibur: boolean, holder?: number) => {
        const base = defaultRuleForNumberOfPlayer(5)
        const rule: TRule = enableExcalibur ? { ...base, enableExcalibur: true } : base
        const game = Create(rule, undefined, 0)
        UpdateRecentTeamMember(game, [0, 1])
        if (holder !== undefined) {
            SetExcalibur(game, rule, holder)
        }
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        return { game, rule }
    }
    it("EXCALIBUR_DISABLED", () => {
        const { game, rule } = approvedTeam(false)
        const snapshot = JSON.stringify(game)
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true, true], 0), "EXCALIBUR_DISABLED")
        expect(JSON.stringify(game)).toBe(snapshot)
    })
    it("EXCALIBUR_NOT_ASSIGNED", () => {
        const { game, rule } = approvedTeam(true)
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true, true], 0), "EXCALIBUR_NOT_ASSIGNED")
    })
    it("INVALID_EXCALIBUR_TARGET", () => {
        const { game, rule } = approvedTeam(true, 1)
        const snapshot = JSON.stringify(game)
        // The holder cannot target themselves, nor anyone outside the team.
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true, true], 1), "INVALID_EXCALIBUR_TARGET")
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [{ player: 0, vote: true }, { player: 1, vote: true }], 3), "INVALID_EXCALIBUR_TARGET")
        expect(JSON.stringify(game)).toBe(snapshot)
    })
    it("INVALID_VOTER / DUPLICATE_VOTER / INVALID_VOTE for per-player votes", () => {
        const { game, rule } = approvedTeam(false)
        const snapshot = JSON.stringify(game)
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [{ player: 0, vote: true }, { player: 3, vote: true }]), "INVALID_VOTER")
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [{ player: 0, vote: true }, { player: 0, vote: true }]), "DUPLICATE_VOTER")
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [{ player: 0, vote: true }, { player: 1, vote: "true" as unknown as boolean }]), "INVALID_VOTE")
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true, { player: 1, vote: true }] as unknown as boolean[]), "INVALID_VOTE")
        expect(JSON.stringify(game)).toBe(snapshot)
    })
})

describe("error codes from SetNextLadyOfTheLake", () => {
    it("INVALID_STAGE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        expectAvalonError(() => SetNextLadyOfTheLake(game, rule, 0), "INVALID_STAGE")
    })
    it("INVALID_LADY_OF_THE_LAKE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        rule.hasLadyOfTheLake = true
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        UpdateRecentQuestVote(game, rule, [true, true])
        UpdateRecentTeamMember(game, [0, 1, 2])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        UpdateRecentQuestVote(game, rule, [true, true, true])
        expect(game.stage).toBe("ladyOfTheLake")
        expectAvalonError(() => SetNextLadyOfTheLake(game, rule, -1), "INVALID_LADY_OF_THE_LAKE")
    })
    it("CANNOT_CREATE_NEW_TEAM leaves the state untouched", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        rule.hasLadyOfTheLake = true
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        UpdateRecentQuestVote(game, rule, [true, true])
        UpdateRecentTeamMember(game, [0, 1, 2])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        UpdateRecentQuestVote(game, rule, [true, true, true])
        expect(game.stage).toBe("ladyOfTheLake")

        // A state whose proposal cap is already exhausted (e.g. restored from elsewhere).
        const exhausted: TRule = { ...rule, quest: { ...rule.quest, team: { mode: "whole", maxCountOfSummonTeam: 2 } } }
        const target = (game.quests[1].ladyOfTheLake! + 1) % rule.numberOfPlayer
        const snapshot = JSON.stringify(game)
        expectAvalonError(() => SetNextLadyOfTheLake(game, exhausted, target), "CANNOT_CREATE_NEW_TEAM")
        expect(JSON.stringify(game)).toBe(snapshot)
    })
})

describe("error codes from ChangeToAssassinate", () => {
    it("INVALID_STAGE (game already ended)", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        ChangeToAssassinate(game)
        Assassinate(game, 0)
        expect(game.stage).toBe("end")
        expectAvalonError(() => ChangeToAssassinate(game), "INVALID_STAGE")
    })
})

describe("error codes from SetExcalibur", () => {
    it("EXCALIBUR_DISABLED", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        expectAvalonError(() => SetExcalibur(game, rule, 1), "EXCALIBUR_DISABLED")
    })
    it("INVALID_STAGE", () => {
        const rule: TRule = { ...defaultRuleForNumberOfPlayer(5), enableExcalibur: true }
        const game = Create(rule)
        ChangeToAssassinate(game)
        expectAvalonError(() => SetExcalibur(game, rule, 1), "INVALID_STAGE")
    })
    it("NO_RECENT_TEAM", () => {
        const rule: TRule = { ...defaultRuleForNumberOfPlayer(5), enableExcalibur: true }
        const game = Create(rule)
        game.quests.forEach(q => { q.teams = [] })
        expectAvalonError(() => SetExcalibur(game, rule, 1), "NO_RECENT_TEAM")
    })
    it("EXCALIBUR_NOT_TEAM_MEMBER", () => {
        const rule: TRule = { ...defaultRuleForNumberOfPlayer(5), enableExcalibur: true }
        const game = Create(rule)
        const leader = game.quests[0].teams[0].leader
        const member = (leader + 1) % rule.numberOfPlayer
        UpdateRecentTeamMember(game, [leader, member])
        const outsider = [0, 1, 2, 3, 4].find(i => i !== leader && i !== member)!
        expectAvalonError(() => SetExcalibur(game, rule, outsider), "EXCALIBUR_NOT_TEAM_MEMBER")
    })
    it("EXCALIBUR_IS_LEADER", () => {
        const rule: TRule = { ...defaultRuleForNumberOfPlayer(5), enableExcalibur: true }
        const game = Create(rule)
        const leader = game.quests[0].teams[0].leader
        const member = (leader + 1) % rule.numberOfPlayer
        UpdateRecentTeamMember(game, [leader, member])
        expectAvalonError(() => SetExcalibur(game, rule, leader), "EXCALIBUR_IS_LEADER")
    })
})

describe("error codes from Assassinate", () => {
    it("INVALID_STAGE", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        expectAvalonError(() => Assassinate(game, 0), "INVALID_STAGE")
    })
    it("INVALID_ASSASSINATION_TARGET", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        ChangeToAssassinate(game)
        expectAvalonError(() => Assassinate(game, -1), "INVALID_ASSASSINATION_TARGET")
        expectAvalonError(() => Assassinate(game, rule.numberOfPlayer), "INVALID_ASSASSINATION_TARGET")
        expectAvalonError(() => Assassinate(game, 1.5), "INVALID_ASSASSINATION_TARGET")
    })
})

describe("error codes from updateLancelotAlignment", () => {
    it("MISSING_LANCELOT_SWITCH", () => {
        const rule: TRule = { ...defaultRuleForNumberOfPlayer(7, "rule1"), lancelot: "rule1" }
        const game = Create(rule)
        game.lancelotSwitch = undefined
        // Trigger the lancelot alignment code path via a team-vote rejection.
        UpdateRecentTeamMember(game, [0, 1])
        const rejectVotes: TTeam["votes"] = teamVotes(rule.numberOfPlayer, false)
        const snapshot = JSON.stringify(game)
        expectAvalonError(() => UpdateRecentTeamVote(game, rule, rejectVotes), "MISSING_LANCELOT_SWITCH")
        // The error is raised before any mutation, so the game is not left half-updated.
        expect(JSON.stringify(game)).toBe(snapshot)
    })
})

describe("NO_QUEST_IN_PROGRESS / NO_TEAM_IN_PROGRESS / NO_LAST_FINISHED_QUEST / LADY_OF_THE_LAKE_ALREADY_HELD", () => {
    it("NO_QUEST_IN_PROGRESS (UpdateRecentTeamMember)", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        game.quests.forEach(q => { q.state = "finished" })
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, 1]), "NO_QUEST_IN_PROGRESS")
    })
    it("NO_TEAM_IN_PROGRESS (UpdateRecentTeamMember)", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        game.quests[0].teams = []
        expectAvalonError(() => UpdateRecentTeamMember(game, [0, 1]), "NO_TEAM_IN_PROGRESS")
    })
    it("NO_QUEST_IN_PROGRESS (UpdateRecentQuestVote)", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        game.stage = "quest"
        game.quests.forEach(q => { q.state = "notStarted" })
        expectAvalonError(() => UpdateRecentQuestVote(game, rule, [true, true]), "NO_QUEST_IN_PROGRESS")
    })
    it("NO_LAST_FINISHED_QUEST", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        const game = Create(rule)
        game.stage = "ladyOfTheLake"
        expectAvalonError(() => SetNextLadyOfTheLake(game, rule, 0), "NO_LAST_FINISHED_QUEST")
    })
    it("LADY_OF_THE_LAKE_ALREADY_HELD", () => {
        const rule = defaultRuleForNumberOfPlayer(5)
        rule.hasLadyOfTheLake = true
        const game = Create(rule)
        UpdateRecentTeamMember(game, [0, 1])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        UpdateRecentQuestVote(game, rule, [true, true])
        UpdateRecentTeamMember(game, [0, 1, 2])
        UpdateRecentTeamVote(game, rule, teamVotes(rule.numberOfPlayer, true))
        UpdateRecentQuestVote(game, rule, [true, true, true])
        expect(game.stage).toBe("ladyOfTheLake")
        const existing = game.quests[1].ladyOfTheLake!
        expectAvalonError(() => SetNextLadyOfTheLake(game, rule, existing), "LADY_OF_THE_LAKE_ALREADY_HELD")
    })
})
