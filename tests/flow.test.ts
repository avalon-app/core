import { applyAction, areLancelotsSwitched, createRule, GameState, getAlignment, getPendingActions, getScore, LancelotVariant } from "../src"
import { expectAvalonError, playCards, propose, rejectTeam, runQuest, setup, voteAll } from "./helpers"

// 7 players with Lancelot, leader 0:
// 0 merlin, 1 percival, 2 loyalServant, 3 lancelotGood (good) · 4 morgana, 5 assassin, 6 lancelotEvil (evil)
const lancelotGame = (variant: LancelotVariant, cards: boolean[], options: { ladyOfTheLake?: boolean } = {}): GameState => {
    const state = setup(createRule(7, { lancelot: variant, ...options }))
    return { ...state, lancelotDeck: { cards, revealed: state.lancelotDeck!.revealed } }
}

describe("Lancelot rule1", () => {
    it("reveals one card per team-building phase from the third quest on, until the pile runs out", () => {
        let state = lancelotGame("rule1", [true, false, false, false, true])
        state = runQuest(state, [0, 4], [4])
        state = runQuest(state, [0, 1, 2])
        // Quest 3, team-building 1: card #1 (switch).
        expect(state.lancelotDeck!.revealed).toBe(1)
        expect(getAlignment(state, 3)).toBe("evil")
        expect(getAlignment(state, 6)).toBe("good")

        // Re-proposals reveal cards #2-#4 (no switch); the switch persists.
        state = rejectTeam(state, [0, 1, 2])
        state = rejectTeam(state, [0, 1, 2])
        state = rejectTeam(state, [0, 1, 2])
        expect(state.lancelotDeck!.revealed).toBe(4)
        expect(areLancelotsSwitched(state)).toBe(true)

        // Quest 4 starts: card #5 (switch back).
        state = runQuest(state, [0, 1, 4], [4])
        expect(state.lancelotDeck!.revealed).toBe(5)
        expect(getAlignment(state, 3)).toBe("good")

        // The pile is exhausted.
        state = rejectTeam(state, [0, 1, 2, 3])
        expect(state.lancelotDeck!.revealed).toBe(5)
        expect(getAlignment(state, 3)).toBe("good")
    })

    it("judges quest cards by the current alignment", () => {
        let state = lancelotGame("rule1", [true, false, false, false, false])
        state = runQuest(state, [0, 4], [4])
        state = runQuest(state, [0, 1, 2])
        state = voteAll(propose(state, [0, 3, 6]), true)
        // The switched lancelotEvil is now good; lancelotGood is now evil and may fail.
        expectAvalonError(() => applyAction(state, { type: "playQuestCard", player: 6, success: false }), "GOOD_MUST_SUCCEED")
        expect(() => applyAction(state, { type: "playQuestCard", player: 3, success: false })).not.toThrow()
    })

    it("lets the Lady of the Lake see the alignment at the time of use", () => {
        let state = lancelotGame("rule1", [true, false, false, false, false], { ladyOfTheLake: true })
        state = runQuest(state, [0, 4], [4])
        state = runQuest(state, [0, 1, 2])
        expect(state.stage).toBe("ladyOfTheLake")
        // Before quest 3 starts, lancelotGood is still good; the switch comes right after.
        state = applyAction(state, { type: "useLadyOfTheLake", player: 6, target: 3 })
        expect(state.ladyOfTheLake!.uses[0].alignment).toBe("good")
        expect(getAlignment(state, 3)).toBe("evil")
    })
})

describe("Lancelot rule2", () => {
    it("reveals one card as each quest starts, including the first", () => {
        let state = lancelotGame("rule2", [false, true, false, false, true])
        expect(state.lancelotDeck!.revealed).toBe(1)
        expect(areLancelotsSwitched(state)).toBe(false)

        state = runQuest(state, [0, 1])
        expect(state.lancelotDeck!.revealed).toBe(2)
        expect(areLancelotsSwitched(state)).toBe(true)

        // Re-proposals do not reveal cards.
        state = rejectTeam(state, [0, 1, 2])
        expect(state.lancelotDeck!.revealed).toBe(2)

        state = runQuest(state, [0, 1, 4], [4])
        state = runQuest(state, [0, 1, 4], [4])
        state = runQuest(state, [0, 1, 2, 4])
        expect(getScore(state)).toEqual({ succeeded: 2, failed: 2 })
        expect(state.lancelotDeck!.revealed).toBe(5)
        expect(areLancelotsSwitched(state)).toBe(false)
    })
})

describe("Lancelot rule3", () => {
    it("never switches", () => {
        let state = setup(createRule(7, { lancelot: "rule3" }))
        state = runQuest(state, [0, 4], [4])
        state = runQuest(state, [0, 1, 2])
        state = rejectTeam(state, [0, 1, 2])
        expect(state.lancelotDeck).toBeUndefined()
        expect(getAlignment(state, 3)).toBe("good")
        expect(getAlignment(state, 6)).toBe("evil")
    })
})

describe("a full game with every module", () => {
    it("plays from the first proposal to the assassination", () => {
        // 7 players, leader 0, Lady starts with seat 6:
        // 0 merlin, 1 percival, 2-3 loyalServant · 4 morgana, 5 assassin, 6 oberon
        let state = setup(createRule(7, { ladyOfTheLake: true, excalibur: true }))
        expect(state.ladyOfTheLake!.holder).toBe(6)

        // Quest 1: approved, both succeed, Excalibur declined.
        state = runQuest(state, [0, 1], [], 1)
        expect(state.stage).toBe("excalibur")
        state = applyAction(state, { type: "useExcalibur", player: 1, target: null })
        expect(state.quests[0].status).toBe("succeeded")
        expect(state.leader).toBe(1)

        // Quest 2: first team rejected; second team approved; Excalibur turns Morgana's fail into a success.
        state = voteAll(propose(state, [1, 2, 4], 4), false)
        expect(state.leader).toBe(2)
        state = runQuest(state, [2, 3, 4], [4], 3)
        state = applyAction(state, { type: "useExcalibur", player: 3, target: 4 })
        expect(state.quests[1].result).toEqual({ success: true, failCount: 0, cards: [true, true, true], excalibur: { target: 4, originalCard: false } })

        // Lady of the Lake: Oberon examines Morgana.
        expect(getPendingActions(state)).toEqual([{ type: "useLadyOfTheLake", players: [6] }])
        state = applyAction(state, { type: "useLadyOfTheLake", player: 6, target: 4 })
        expect(state.ladyOfTheLake!.uses).toEqual([{ afterQuest: 1, holder: 6, target: 4, alignment: "evil" }])
        expect(state.leader).toBe(3)

        // Quest 3: the holder declines Excalibur before the cards are played; two fail cards fail it.
        state = voteAll(propose(state, [3, 5, 6], 5), true)
        state = applyAction(state, { type: "useExcalibur", player: 5, target: null })
        state = playCards(state, [5, 6])
        expect(state.quests[2].status).toBe("failed")
        expect(state.stage).toBe("ladyOfTheLake")

        // Lady of the Lake: Morgana examines Merlin.
        state = applyAction(state, { type: "useLadyOfTheLake", player: 4, target: 0 })
        expect(state.leader).toBe(4)

        // Quest 4 needs two fails; one is not enough.
        state = runQuest(state, [0, 1, 2, 4], [4], 0)
        state = applyAction(state, { type: "useExcalibur", player: 0, target: null })
        expect(state.quests[3]).toMatchObject({ status: "succeeded", result: { failCount: 1 } })
        expect(getScore(state)).toEqual({ succeeded: 3, failed: 1 })

        // Good won three quests: the assassin finds Merlin.
        expect(state.stage).toBe("assassination")
        state = applyAction(state, { type: "assassinate", player: 5, target: 0 })
        expect(state.result).toEqual({ winner: "evil", reason: "merlinAssassinated" })
    })
})
