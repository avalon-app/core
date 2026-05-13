import { CreateQuests, InProgressQuest, RecentTeam, TQuest } from "../src/quest";
import { defaultRuleForNumberOfPlayer } from "../src/rule"

describe("CreateQuests", () => {
    it("should create initial quests with the correct leader", () => {
        const rule = defaultRuleForNumberOfPlayer(5);
        if (!rule) {
            throw new Error("Rule is undefined");
        }
        const leader = 0;
        const quests = CreateQuests(rule, leader);

        expect(quests.length).toBe(5);
        expect(quests[0].teams[0].leader).toBe(leader);
        expect(quests[0].state).toBe("inProgress");
        expect(quests[1].state).toBe("notStarted");
    });

    it("should throw an error if the leader parameter is invalid", () => {
        const rule = defaultRuleForNumberOfPlayer(5);
        if (!rule) {
            throw new Error("Rule is undefined");
        }
        expect(() => CreateQuests(rule, -1)).toThrow("Invalid leader parameter");
        expect(() => CreateQuests(rule, 5)).toThrow("Invalid leader parameter");
    });

    it("should set ladyOfTheLake correctly if rule hasLadyOfTheLake is true", () => {
        const rule = defaultRuleForNumberOfPlayer(5);
        if (!rule) {
            throw new Error("Rule is undefined");
        }
        rule.hasLadyOfTheLake = true;
        const leader = 0;
        const quests = CreateQuests(rule, leader);

        expect(quests[0].ladyOfTheLake).toBeUndefined();
        expect(quests[1].ladyOfTheLake).toBe(4);
    });

    it("should not set ladyOfTheLake if rule hasLadyOfTheLake is false", () => {
        const rule = defaultRuleForNumberOfPlayer(5);
        if (!rule) {
            throw new Error("Rule is undefined");
        }
        const leader = 0;
        const quests = CreateQuests(rule, leader);

        expect(quests[0].ladyOfTheLake).toBeUndefined();
    });
});

describe("InProgressQuest", () => {
    it("should return the quest that is in progress", () => {
        const rule = defaultRuleForNumberOfPlayer(5);
        if (!rule) {
            throw new Error("Rule is undefined");
        }
        const leader = 0;
        const quests = CreateQuests(rule, leader);

        const inProgressQuest = InProgressQuest(quests);
        expect(inProgressQuest).toBeDefined();
        expect(inProgressQuest?.state).toBe("inProgress");
    });

    it("should return undefined if no quest is in progress", () => {
        const quests = [
            { state: "finished" },
            { state: "notStarted" },
            { state: "notStarted" }
        ] as any;

        const inProgressQuest = InProgressQuest(quests);
        expect(inProgressQuest).toBeUndefined();
    });
});

describe("RecentTeam", () => {
    it("should return the most recent team from the quest that is in progress", () => {
        const rule = defaultRuleForNumberOfPlayer(5);
        if (!rule) {
            throw new Error("Rule is undefined");
        }
        const leader = 0;
        const quests = CreateQuests(rule, leader);
        quests[0].teams.push({ leader: 1, votes: [], members: [1, 2] });

        const recentTeam = RecentTeam(quests);
        expect(recentTeam).toBeDefined();
        expect(recentTeam?.leader).toBe(1);
    });

    it("should return undefined if no team is found in the in-progress quest", () => {
        const quests = [
            { state: "finished", teams: [] },
            { state: "notStarted", teams: [] },
            { state: "notStarted", teams: [] }
        ] as any;
        const recentTeam = RecentTeam(quests);
        expect(recentTeam).toBeUndefined();
    });

    it("should return undefined if no quest is in progress", () => {
        const quests: TQuest[] = [
            { state: "finished", teams: [{ leader: 1, votes: [], members: [1, 2] }] },
            { state: "notStarted", teams: [] },
            { state: "notStarted", teams: [] }
        ] as any;

        const recentTeam = RecentTeam(quests);
        expect(recentTeam).toEqual(quests[0].teams[0]);
    });
});
