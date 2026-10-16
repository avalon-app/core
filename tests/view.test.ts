import { applyAction, createRule, GameState, getPlayerView } from "../src"
import { expectAvalonError, playCards, propose, runQuest, setup, voteAll } from "./helpers"

// 7 players, leader 0: 0 merlin, 1 percival, 2-3 loyalServant · 4 morgana, 5 assassin, 6 oberon
const seven = (options = {}) => setup(createRule(7, options))

const known = (state: GameState, seat: number) => getPlayerView(state, seat).knownPlayers

describe("getPlayerView: what each character knows", () => {
    it("tells players their own character and alignment", () => {
        expect(getPlayerView(seven(), 0)).toMatchObject({ seat: 0, character: "merlin", alignment: "good" })
        expect(getPlayerView(seven(), 4)).toMatchObject({ seat: 4, character: "morgana", alignment: "evil" })
    })

    it("applies the standard visibility rules", () => {
        const state = seven()
        expect(known(state, 0)).toEqual([4, 5, 6].map(seat => ({ seat, via: "merlinSeesEvil" })))
        expect(known(state, 1)).toEqual([0, 4].map(seat => ({ seat, via: "percivalSeesMerlinAndMorgana" })))
        expect(known(state, 2)).toEqual([])
        // Evil players see each other, except Oberon who neither sees nor is seen.
        expect(known(state, 4)).toEqual([{ seat: 5, via: "evilSeesEvil" }])
        expect(known(state, 5)).toEqual([{ seat: 4, via: "evilSeesEvil" }])
        expect(known(state, 6)).toEqual([])
    })

    it("hides Mordred from Merlin", () => {
        // 9 players: 0 merlin, 1 percival, 2-5 loyalServant · 6 mordred, 7 morgana, 8 assassin
        const state = setup(createRule(9))
        expect(known(state, 0).map(k => k.seat)).toEqual([7, 8])
        expect(known(state, 6).map(k => k.seat)).toEqual([7, 8])
    })

    it("shows the evil Lancelot to evil players, and the Lancelots to each other with rule3", () => {
        // 0 merlin, 1 percival, 2 loyalServant, 3 lancelotGood · 4 morgana, 5 assassin, 6 lancelotEvil
        const rule1 = setup(createRule(7, { lancelot: "rule1" }))
        expect(known(rule1, 4)).toEqual([{ seat: 5, via: "evilSeesEvil" }, { seat: 6, via: "evilSeesEvil", character: "lancelotEvil" }])
        expect(known(rule1, 0).map(k => k.seat)).toEqual([4, 5, 6])
        expect(known(rule1, 6)).toEqual([])

        const rule3 = setup(createRule(7, { lancelot: "rule3" }))
        expect(known(rule3, 3)).toEqual([{ seat: 6, via: "lancelotsSeeEachOther" }])
        expect(known(rule3, 6)).toEqual([{ seat: 3, via: "lancelotsSeeEachOther" }])
    })

    it("gives spectators no secret information", () => {
        const view = getPlayerView(seven())
        expect(view.seat).toBeUndefined()
        expect(view.character).toBeUndefined()
        expect(view.knownPlayers).toEqual([])
        expect(view).not.toHaveProperty("characters")
        expect(view).not.toHaveProperty("players")
    })
})

describe("getPlayerView: hidden game information", () => {
    it("shows who has voted, and the votes only once everyone has", () => {
        let state = propose(seven(), [0, 1])
        state = applyAction(state, { type: "voteTeam", player: 2, approve: false })
        const team = getPlayerView(state, 0).quests[0].teams[0]
        expect(team).toEqual({ leader: 0, members: [0, 1], voted: [false, false, true, false, false, false, false] })

        state = voteAll(propose(seven(), [0, 1]), true)
        expect(getPlayerView(state, 0).quests[0].teams[0]).toMatchObject({ votes: [true, true, true, true, true, true, true], approved: true })
    })

    it("never shows quest cards before the quest resolves, nor who played them after", () => {
        let state = voteAll(propose(seven(), [0, 4]), true)
        state = applyAction(state, { type: "playQuestCard", player: 4, success: false })
        const during = getPlayerView(state, 0)
        expect(during.quests[0].playedBy).toEqual([4])
        expect(JSON.stringify(during)).not.toContain("pendingCards")
        expect(during.quests[0].result).toBeUndefined()

        state = applyAction(state, { type: "playQuestCard", player: 0, success: true })
        expect(getPlayerView(state, 0).quests[0]).toMatchObject({ status: "failed", result: { cards: [true, false], failCount: 1 } })
        expect(getPlayerView(state, 0).quests[0].playedBy).toBeUndefined()
    })

    it("shows the original Excalibur card to the holder only", () => {
        let state = voteAll(propose(seven({ excalibur: true }), [1, 4], 4), true)
        state = playCards(state, [])
        state = applyAction(state, { type: "useExcalibur", player: 4, target: 1 })
        expect(getPlayerView(state, 4).quests[0].result!.excalibur).toEqual({ target: 1, originalCard: true })
        expect(getPlayerView(state, 1).quests[0].result!.excalibur).toEqual({ target: 1 })
        expect(getPlayerView(state).quests[0].result!.excalibur).toEqual({ target: 1 })
    })

    it("keeps an early Excalibur decision between the holder and the engine", () => {
        let state = voteAll(propose(seven({ excalibur: true }), [1, 4], 4), true)
        expect(getPlayerView(state, 4).pendingActions).toContainEqual({ type: "useExcalibur", players: [4] })
        expect(getPlayerView(state, 1).pendingActions).toEqual([{ type: "playQuestCard", players: [1, 4] }])

        state = applyAction(state, { type: "useExcalibur", player: 4, target: 1 })
        expect(getPlayerView(state, 4).quests[0].pendingExcaliburTarget).toBe(1)
        // Other players cannot even tell whether the holder has decided.
        for (const seat of [0, 1, undefined]) {
            const view = getPlayerView(state, seat)
            expect(view.quests[0]).not.toHaveProperty("pendingExcaliburTarget")
            expect(view.pendingActions).toEqual([{ type: "playQuestCard", players: [1, 4] }])
        }
    })

    it("shows the Lady of the Lake result to the holder only, and to everyone at the end", () => {
        let state = runQuest(runQuest(seven({ ladyOfTheLake: true }), [0, 1]), [0, 1, 2])
        state = applyAction(state, { type: "useLadyOfTheLake", player: 6, target: 4 })
        expect(getPlayerView(state, 6).ladyOfTheLake!.uses).toEqual([{ afterQuest: 1, holder: 6, target: 4, alignment: "evil" }])
        expect(getPlayerView(state, 4).ladyOfTheLake!.uses).toEqual([{ afterQuest: 1, holder: 6, target: 4 }])

        state = runQuest(state, [0, 1, 2])
        state = applyAction(state, { type: "assassinate", player: 5, target: 1 })
        expect(getPlayerView(state, 4).ladyOfTheLake!.uses[0].alignment).toBe("evil")
    })

    it("reveals every character once the game has ended", () => {
        let state = runQuest(runQuest(runQuest(seven(), [0, 1]), [0, 1, 2]), [0, 1, 2])
        expect(getPlayerView(state, 0).players).toBeUndefined()
        state = applyAction(state, { type: "assassinate", player: 5, target: 0 })
        const view = getPlayerView(state)
        expect(view.result).toEqual({ winner: "evil", reason: "merlinAssassinated" })
        expect(view.players!.map(p => p.character)).toEqual(state.characters)
        expect(view.players![4]).toEqual({ character: "morgana", alignment: "evil" })
    })

    it("shows only the revealed Lancelot cards", () => {
        const state = setup(createRule(7, { lancelot: "rule2" }))
        const view = getPlayerView(state, 0)
        expect(view.lancelotDeck).toEqual({ revealedCards: [state.lancelotDeck!.cards[0]], remaining: 4 })
    })

    it("tells only the assassin that an early assassination is possible", () => {
        const state = seven({ allowEarlyAssassination: true })
        expect(getPlayerView(state, 5).pendingActions).toContainEqual({ type: "assassinate", players: [5] })
        for (const seat of [0, 4, undefined]) {
            expect(getPlayerView(state, seat).pendingActions).toEqual([{ type: "proposeTeam", players: [0] }])
        }
    })

    it("validates its input", () => {
        expectAvalonError(() => getPlayerView(seven(), 7), "INVALID_PLAYER")
        expectAvalonError(() => getPlayerView({ ...seven(), version: 99 } as never, 0), "INVALID_STATE")
    })
})
