import { applyAction, createRule, GameAction, GameState, getCurrentTeam, getPendingActions, Rule } from "../src"
import { expectAvalonError, playCards, propose, rejectTeam, runQuest, setup, voteAll } from "./helpers"

// 5 players, leader 0: 0 merlin, 1 percival, 2 loyalServant (good) · 3 morgana, 4 assassin (evil)
const five = () => setup(createRule(5))

describe("applyAction", () => {
    it("never modifies the given state", () => {
        const state = five()
        const snapshot = JSON.stringify(state)
        const next = propose(state, [0, 1])
        expect(JSON.stringify(state)).toBe(snapshot)
        expect(next).not.toBe(state)
        expect(next.stage).toBe("teamVote")
    })

    it("leaves the state untouched when a move is illegal", () => {
        const state = propose(five(), [0, 1])
        const snapshot = JSON.stringify(state)
        expectAvalonError(() => applyAction(state, { type: "voteTeam", player: 0, approve: "yes" as never }), "INVALID_VOTE")
        expect(JSON.stringify(state)).toBe(snapshot)
    })

    it("rejects unknown states and actions", () => {
        expectAvalonError(() => applyAction({ ...five(), version: 1 } as never, { type: "voteTeam", player: 0, approve: true }), "INVALID_STATE")
        expectAvalonError(() => applyAction(undefined as never, { type: "voteTeam", player: 0, approve: true }), "INVALID_STATE")
        expectAvalonError(() => applyAction(five(), { type: "dance", player: 0 } as never), "UNKNOWN_ACTION")
    })

    it("rejects moves made in the wrong stage", () => {
        const state = five()
        const moves: GameAction[] = [
            { type: "voteTeam", player: 0, approve: true },
            { type: "playQuestCard", player: 0, success: true },
            { type: "useExcalibur", player: 0, target: null },
            { type: "useLadyOfTheLake", player: 0, target: 1 },
            { type: "assassinate", player: 4, target: 0 },
        ]
        moves.forEach(move => expectAvalonError(() => applyAction(state, move), "INVALID_STAGE"))
    })
})

describe("proposeTeam", () => {
    it("moves to the team vote", () => {
        const state = propose(five(), [0, 3])
        expect(state.stage).toBe("teamVote")
        expect(getCurrentTeam(state)).toEqual({ leader: 0, members: [0, 3], votes: [null, null, null, null, null] })
    })

    it("only lets the leader propose", () => {
        expectAvalonError(() => applyAction(five(), { type: "proposeTeam", player: 1, members: [0, 1] }), "PLAYER_CANNOT_ACT")
        expectAvalonError(() => applyAction(five(), { type: "proposeTeam", player: 9, members: [0, 1] }), "INVALID_PLAYER")
    })

    it("validates the members", () => {
        const state = five()
        expectAvalonError(() => propose(state, [0]), "INVALID_TEAM_SIZE")
        expectAvalonError(() => propose(state, [0, 1, 2]), "INVALID_TEAM_SIZE")
        expectAvalonError(() => propose(state, [0, 5]), "INVALID_TEAM_MEMBER")
        expectAvalonError(() => propose(state, [0, -1]), "INVALID_TEAM_MEMBER")
        expectAvalonError(() => propose(state, [0, 0.5]), "INVALID_TEAM_MEMBER")
        expectAvalonError(() => propose(state, [0, NaN]), "INVALID_TEAM_MEMBER")
        expectAvalonError(() => propose(state, [1, 1]), "DUPLICATE_TEAM_MEMBER")
    })

    it("requires a valid Excalibur holder when Excalibur is in play", () => {
        const withExcalibur = setup(createRule(5, { excalibur: true }))
        expectAvalonError(() => propose(withExcalibur, [0, 1]), "EXCALIBUR_HOLDER_REQUIRED")
        expectAvalonError(() => propose(withExcalibur, [0, 1], 0), "INVALID_EXCALIBUR_HOLDER")
        expectAvalonError(() => propose(withExcalibur, [0, 1], 2), "INVALID_EXCALIBUR_HOLDER")
        expect(getCurrentTeam(propose(withExcalibur, [0, 1], 1))!.excaliburHolder).toBe(1)
        expectAvalonError(() => propose(five(), [0, 1], 1), "EXCALIBUR_DISABLED")
    })
})

describe("voteTeam", () => {
    it("waits for every player, then approves on a strict majority", () => {
        let state = propose(five(), [0, 1])
        ;[true, true, true, false].forEach((approve, player) => { state = applyAction(state, { type: "voteTeam", player, approve }) })
        expect(state.stage).toBe("teamVote")
        expect(getPendingActions(state)).toEqual([{ type: "voteTeam", players: [4] }])
        state = applyAction(state, { type: "voteTeam", player: 4, approve: false })
        expect(state.stage).toBe("quest")
        expect(state.quests[0].teams[0]).toMatchObject({ approved: true, votes: [true, true, true, false, false] })
    })

    it("rejects a tie", () => {
        let state = propose(setup(createRule(6)), [0, 1])
        ;[true, true, true, false, false, false].forEach((approve, player) => { state = applyAction(state, { type: "voteTeam", player, approve }) })
        expect(state.quests[0].teams[0].approved).toBe(false)
        expect(state.stage).toBe("teamBuilding")
    })

    it("passes the leadership clockwise after a rejection", () => {
        const state = rejectTeam(setup(createRule(5), 4), [0, 1])
        expect(state.leader).toBe(0)
        expect(state.stage).toBe("teamBuilding")
        expect(state.quests[0].teams).toHaveLength(1)
    })

    it("lets evil win when the 5th team of a quest is rejected", () => {
        let state = five()
        for (let i = 0; i < 4; i++) {
            state = rejectTeam(state, [0, 1])
        }
        expect(state.stage).toBe("teamBuilding")
        state = rejectTeam(state, [0, 1])
        expect(state.stage).toBe("ended")
        expect(state.result).toEqual({ winner: "evil", reason: "teamProposalLimitReached" })
    })

    it("counts proposals across the game with scope \"game\"", () => {
        const base = createRule(5)
        const rule: Rule = { ...base, teamProposalLimit: { scope: "game", max: 3 } }
        let state = runQuest(rejectTeam(setup(rule), [0, 1]), [0, 1])
        expect(state.stage).toBe("teamBuilding")
        state = rejectTeam(state, [0, 1, 2])
        expect(state.result).toEqual({ winner: "evil", reason: "teamProposalLimitReached" })
    })

    it("ends the game when the limit is used up as a quest ends", () => {
        const base = createRule(5, { ladyOfTheLake: true })
        const rule: Rule = { ...base, teamProposalLimit: { scope: "game", max: 2 } }
        const state = runQuest(runQuest(setup(rule), [0, 1]), [0, 1, 2])
        // Without a team for quest 3 the game cannot go on — not even to the Lady of the Lake.
        expect(state.stage).toBe("ended")
        expect(state.result).toEqual({ winner: "evil", reason: "teamProposalLimitReached" })
        expect(state.quests[2].status).toBe("pending")
    })

    it("validates the voter and the vote", () => {
        const state = propose(five(), [0, 1])
        expectAvalonError(() => applyAction(state, { type: "voteTeam", player: 5, approve: true }), "INVALID_PLAYER")
        expectAvalonError(() => applyAction(state, { type: "voteTeam", player: 0, approve: 1 as never }), "INVALID_VOTE")
        const voted = applyAction(state, { type: "voteTeam", player: 0, approve: true })
        expectAvalonError(() => applyAction(voted, { type: "voteTeam", player: 0, approve: false }), "ALREADY_ACTED")
    })
})

describe("playQuestCard", () => {
    const onQuest = (members: number[]) => voteAll(propose(five(), members), true)

    it("resolves once every member has played, hiding who played what", () => {
        let state = onQuest([0, 3])
        state = applyAction(state, { type: "playQuestCard", player: 3, success: false })
        expect(state.quests[0].pendingCards).toEqual([{ player: 3, success: false }])
        expect(getPendingActions(state)).toEqual([{ type: "playQuestCard", players: [0] }])
        state = applyAction(state, { type: "playQuestCard", player: 0, success: true })
        expect(state.quests[0]).toMatchObject({ status: "failed", result: { success: false, failCount: 1, cards: [true, false] } })
        expect(state.quests[0].pendingCards).toBeUndefined()
        expect(state.stage).toBe("teamBuilding")
        expect(state.leader).toBe(1)
        expect(state.quests[1].status).toBe("active")
    })

    it("needs two fails on a quest that requires them", () => {
        // 7 players: 0 merlin, 1 percival, 2-3 loyalServant · 4 morgana, 5 assassin, 6 oberon
        let state = setup(createRule(7))
        state = runQuest(state, [0, 1])
        state = runQuest(state, [0, 1, 2])
        state = runQuest(state, [0, 1, 4], [4])
        state = runQuest(state, [0, 1, 2, 4], [4])
        expect(state.quests[3]).toMatchObject({ status: "succeeded", result: { failCount: 1 } })
    })

    it("only accepts cards from team members, once each", () => {
        const state = onQuest([0, 3])
        expectAvalonError(() => applyAction(state, { type: "playQuestCard", player: 1, success: true }), "PLAYER_CANNOT_ACT")
        expectAvalonError(() => applyAction(state, { type: "playQuestCard", player: 3, success: "fail" as never }), "INVALID_VOTE")
        const played = applyAction(state, { type: "playQuestCard", player: 3, success: true })
        expectAvalonError(() => applyAction(played, { type: "playQuestCard", player: 3, success: false }), "ALREADY_ACTED")
    })

    it("does not let good players fail a quest", () => {
        expectAvalonError(() => applyAction(onQuest([0, 3]), { type: "playQuestCard", player: 0, success: false }), "GOOD_MUST_SUCCEED")
    })
})

describe("useExcalibur", () => {
    // Excalibur goes to seat 3 (morgana); seat 1 (percival) is the other member.
    const atExcalibur = (successes: [boolean, boolean] = [true, false]) => {
        const state = voteAll(propose(setup(createRule(5, { excalibur: true })), [1, 3], 3), true)
        return playCards(state, successes[1] ? [] : [3])
    }

    it("waits for the holder after the cards are played", () => {
        const state = atExcalibur()
        expect(state.stage).toBe("excalibur")
        expect(getPendingActions(state)).toEqual([{ type: "useExcalibur", players: [3] }])
    })

    it("switches the target's card and records the original", () => {
        // Morgana failed, then uses Excalibur on Percival's success: two fails.
        const state = applyAction(atExcalibur(), { type: "useExcalibur", player: 3, target: 1 })
        expect(state.quests[0].result).toEqual({ success: false, failCount: 2, cards: [false, false], excalibur: { target: 1, originalCard: true } })
    })

    it("may be declined", () => {
        const state = applyAction(atExcalibur(), { type: "useExcalibur", player: 3, target: null })
        expect(state.quests[0].result).toEqual({ success: false, failCount: 1, cards: [true, false] })
    })

    it("only the holder may use it, on another team member", () => {
        const state = atExcalibur()
        expectAvalonError(() => applyAction(state, { type: "useExcalibur", player: 1, target: 3 }), "PLAYER_CANNOT_ACT")
        expectAvalonError(() => applyAction(state, { type: "useExcalibur", player: 3, target: 3 }), "INVALID_EXCALIBUR_TARGET")
        expectAvalonError(() => applyAction(state, { type: "useExcalibur", player: 3, target: 0 }), "INVALID_EXCALIBUR_TARGET")
    })

    describe("decided while the cards are being played", () => {
        // The team [1, 3] is on the quest with Excalibur held by seat 3; no card played yet.
        const onQuest = (rule = createRule(5, { excalibur: true })) => voteAll(propose(setup(rule), [1, 3], 3), true)
        const play = (state: GameState, player: number, success: boolean) => applyAction(state, { type: "playQuestCard", player, success })

        it("is kept secret and applied as soon as the last card is played", () => {
            let state = onQuest()
            expect(getPendingActions(state)).toEqual([
                { type: "playQuestCard", players: [1, 3] },
                { type: "useExcalibur", players: [3] },
            ])
            state = applyAction(state, { type: "useExcalibur", player: 3, target: 1 })
            expect(state.stage).toBe("quest")
            expect(state.quests[0].pendingExcaliburTarget).toBe(1)
            expect(getPendingActions(state)).toEqual([{ type: "playQuestCard", players: [1, 3] }])

            state = play(play(state, 1, true), 3, false)
            // No excalibur stage: the quest resolves with the early decision.
            expect(state.stage).toBe("teamBuilding")
            expect(state.quests[0].result).toEqual({ success: false, failCount: 2, cards: [false, false], excalibur: { target: 1, originalCard: true } })
            expect(state.quests[0]).not.toHaveProperty("pendingExcaliburTarget")
        })

        it("may come between cards, and may decline", () => {
            let state = play(onQuest(), 3, true)
            state = applyAction(state, { type: "useExcalibur", player: 3, target: null })
            expect(state.quests[0].pendingExcaliburTarget).toBeNull()
            state = play(state, 1, true)
            expect(state.quests[0].result).toEqual({ success: true, failCount: 0, cards: [true, true] })
        })

        it("is made once, by the holder, on another team member", () => {
            const state = onQuest()
            expectAvalonError(() => applyAction(state, { type: "useExcalibur", player: 1, target: 3 }), "PLAYER_CANNOT_ACT")
            expectAvalonError(() => applyAction(state, { type: "useExcalibur", player: 3, target: 3 }), "INVALID_EXCALIBUR_TARGET")
            expectAvalonError(() => applyAction(state, { type: "useExcalibur", player: 3, target: 0 }), "INVALID_EXCALIBUR_TARGET")
            const decided = applyAction(state, { type: "useExcalibur", player: 3, target: null })
            expectAvalonError(() => applyAction(decided, { type: "useExcalibur", player: 3, target: 1 }), "ALREADY_ACTED")
        })

        it("is not available without Excalibur", () => {
            const state = voteAll(propose(five(), [1, 3]), true)
            expectAvalonError(() => applyAction(state, { type: "useExcalibur", player: 3, target: 1 }), "EXCALIBUR_DISABLED")
        })

        it("is discarded when the game ends before the quest resolves", () => {
            let state = onQuest(createRule(5, { excalibur: true, allowEarlyAssassination: true }))
            state = applyAction(state, { type: "useExcalibur", player: 3, target: 1 })
            state = applyAction(state, { type: "assassinate", player: 4, target: 0 })
            expect(state.stage).toBe("ended")
            expect(state.quests[0]).not.toHaveProperty("pendingExcaliburTarget")
        })
    })
})

describe("useLadyOfTheLake", () => {
    // Leader 0, so the Lady starts with seat 4 (assassin).
    const afterTwoQuests = (): GameState => runQuest(runQuest(setup(createRule(5, { ladyOfTheLake: true })), [0, 1]), [0, 1, 2])

    it("is used after the second quest, not the first", () => {
        const afterOne = runQuest(setup(createRule(5, { ladyOfTheLake: true })), [0, 1])
        expect(afterOne.stage).toBe("teamBuilding")
        const state = afterTwoQuests()
        expect(state.stage).toBe("ladyOfTheLake")
        expect(getPendingActions(state)).toEqual([{ type: "useLadyOfTheLake", players: [4] }])
    })

    it("reveals the target's alignment to the record and passes the Lady on", () => {
        const state = applyAction(afterTwoQuests(), { type: "useLadyOfTheLake", player: 4, target: 0 })
        expect(state.ladyOfTheLake).toEqual({ holder: 0, uses: [{ afterQuest: 1, holder: 4, target: 0, alignment: "good" }] })
        expect(state.stage).toBe("teamBuilding")
        expect(state.leader).toBe(2)
        expect(state.quests[2].status).toBe("active")
    })

    it("cannot examine the holder, a former holder or an invalid seat", () => {
        const state = afterTwoQuests()
        expectAvalonError(() => applyAction(state, { type: "useLadyOfTheLake", player: 0, target: 1 }), "PLAYER_CANNOT_ACT")
        expectAvalonError(() => applyAction(state, { type: "useLadyOfTheLake", player: 4, target: 4 }), "INVALID_LADY_OF_THE_LAKE_TARGET")
        expectAvalonError(() => applyAction(state, { type: "useLadyOfTheLake", player: 4, target: 7 }), "INVALID_LADY_OF_THE_LAKE_TARGET")

        // Quest 3 fails so the game goes on; the new holder (0) may not examine the old one (4).
        const next = runQuest(applyAction(state, { type: "useLadyOfTheLake", player: 4, target: 0 }), [2, 3], [3])
        expect(next.stage).toBe("ladyOfTheLake")
        expectAvalonError(() => applyAction(next, { type: "useLadyOfTheLake", player: 0, target: 4 }), "INVALID_LADY_OF_THE_LAKE_TARGET")
    })

    it("is skipped when the game is decided", () => {
        let state = setup(createRule(5, { ladyOfTheLake: true }))
        state = runQuest(state, [0, 1])
        state = runQuest(state, [0, 1, 2])
        state = applyAction(state, { type: "useLadyOfTheLake", player: 4, target: 0 })
        state = runQuest(state, [0, 1])
        expect(state.stage).toBe("assassination")
    })
})

describe("assassinate", () => {
    const atAssassination = () => runQuest(runQuest(runQuest(five(), [0, 1]), [0, 1, 2]), [0, 1])

    it("follows three successful quests", () => {
        const state = atAssassination()
        expect(state.stage).toBe("assassination")
        expect(getPendingActions(state)).toEqual([{ type: "assassinate", players: [4] }])
    })

    it("hitting Merlin wins for evil, missing wins for good", () => {
        expect(applyAction(atAssassination(), { type: "assassinate", player: 4, target: 0 })).toMatchObject({
            stage: "ended", assassination: { assassin: 4, target: 0 }, result: { winner: "evil", reason: "merlinAssassinated" },
        })
        expect(applyAction(atAssassination(), { type: "assassinate", player: 4, target: 1 }).result).toEqual({ winner: "good", reason: "assassinationMissed" })
    })

    it("only the assassin may assassinate, and not themselves", () => {
        const state = atAssassination()
        expectAvalonError(() => applyAction(state, { type: "assassinate", player: 3, target: 0 }), "PLAYER_CANNOT_ACT")
        expectAvalonError(() => applyAction(state, { type: "assassinate", player: 4, target: 4 }), "INVALID_ASSASSINATION_TARGET")
        expectAvalonError(() => applyAction(state, { type: "assassinate", player: 4, target: 5 }), "INVALID_ASSASSINATION_TARGET")
    })

    it("is not possible after the game has ended", () => {
        const ended = applyAction(atAssassination(), { type: "assassinate", player: 4, target: 1 })
        expectAvalonError(() => applyAction(ended, { type: "assassinate", player: 4, target: 0 }), "INVALID_STAGE")
    })

    it("can happen at any time with allowEarlyAssassination", () => {
        const state = propose(setup(createRule(5, { allowEarlyAssassination: true })), [0, 1])
        expect(getPendingActions(state)).toContainEqual({ type: "assassinate", players: [4] })
        const ended = applyAction(state, { type: "assassinate", player: 4, target: 2 })
        expect(ended.result).toEqual({ winner: "good", reason: "assassinationMissed" })
        expect(getPendingActions(ended)).toEqual([])
    })

    it("is skipped when Merlin is not in play", () => {
        const base = createRule(5, { allowEarlyAssassination: true })
        const rule: Rule = { ...base, characters: ["loyalServant", "percival", "loyalServant", "morgana", "assassin"] }
        expectAvalonError(() => applyAction(setup(rule), { type: "assassinate", player: 4, target: 0 }), "INVALID_STAGE")
        expect(getPendingActions(setup(rule))).toEqual([{ type: "proposeTeam", players: [0] }])
        const state = runQuest(runQuest(runQuest(setup(rule), [0, 1]), [0, 1, 2]), [0, 1])
        expect(state.result).toEqual({ winner: "good", reason: "threeQuestsSucceeded" })
    })
})

describe("winning by failing quests", () => {
    it("evil wins when three quests fail", () => {
        let state = five()
        state = runQuest(state, [0, 3], [3])
        state = runQuest(state, [0, 1, 4], [4])
        expect(state.stage).toBe("teamBuilding")
        state = runQuest(state, [3, 4], [3, 4])
        expect(state.result).toEqual({ winner: "evil", reason: "threeQuestsFailed" })
        expect(getPendingActions(state)).toEqual([])
    })
})
