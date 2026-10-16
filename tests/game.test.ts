import { createGame, createRule, getAssassinSeat, getPendingActions, getSeatsOf, STATE_VERSION } from "../src"
import { expectAvalonError, seededRandom, setup } from "./helpers"

describe("createGame", () => {
    it("opens the first quest with the first leader choosing a team", () => {
        const rule = createRule(5)
        const state = setup(rule, 2)
        expect(state).toEqual({
            version: STATE_VERSION,
            rule,
            characters: rule.characters,
            stage: "teamBuilding",
            leader: 2,
            quests: [
                { teamSize: 2, failsRequired: 1, status: "active", teams: [] },
                { teamSize: 3, failsRequired: 1, status: "pending", teams: [] },
                { teamSize: 2, failsRequired: 1, status: "pending", teams: [] },
                { teamSize: 3, failsRequired: 1, status: "pending", teams: [] },
                { teamSize: 3, failsRequired: 1, status: "pending", teams: [] },
            ],
        })
        expect(getPendingActions(state)).toEqual([{ type: "proposeTeam", players: [2] }])
    })

    it("gives the Lady of the Lake to the player on the first leader's right", () => {
        expect(setup(createRule(7, { ladyOfTheLake: true }), 0).ladyOfTheLake).toEqual({ holder: 6, uses: [] })
        expect(setup(createRule(7, { ladyOfTheLake: true }), 3).ladyOfTheLake).toEqual({ holder: 2, uses: [] })
    })

    it("deals a random permutation of the rule's characters and a random leader", () => {
        const rule = createRule(10)
        const state = createGame(rule)
        expect([...state.characters].sort()).toEqual([...rule.characters].sort())
        expect(state.leader).toBeGreaterThanOrEqual(0)
        expect(state.leader).toBeLessThan(10)
    })

    it("is reproducible with a seeded random source", () => {
        const rule = createRule(9, { lancelot: "rule1" })
        const a = createGame(rule, { random: seededRandom(7) })
        const b = createGame(rule, { random: seededRandom(7) })
        const c = createGame(rule, { random: seededRandom(8) })
        expect(a).toEqual(b)
        expect(a).not.toEqual(c)
    })

    it("prepares the Lancelot deck", () => {
        const rule1 = createGame(createRule(7, { lancelot: "rule1" }))
        expect(rule1.lancelotDeck!.cards).toHaveLength(5)
        expect(rule1.lancelotDeck!.cards.filter(Boolean)).toHaveLength(2)
        expect(rule1.lancelotDeck!.revealed).toBe(0)

        // rule2 draws 5 of 7 cards and reveals the first one as the first quest starts.
        const rule2 = createGame(createRule(7, { lancelot: "rule2" }))
        expect(rule2.lancelotDeck!.cards).toHaveLength(5)
        expect(rule2.lancelotDeck!.revealed).toBe(1)

        expect(createGame(createRule(7, { lancelot: "rule3" })).lancelotDeck).toBeUndefined()
    })

    it("keeps its own copy of the rule", () => {
        const rule = createRule(5) as unknown as { quests: { teamSize: number }[] }
        const state = createGame(rule as never)
        rule.quests[0].teamSize = 4
        expect(state.rule.quests[0].teamSize).toBe(2)
        expect(state.quests[0].teamSize).toBe(2)
    })

    it("validates its input", () => {
        const rule = createRule(5)
        expectAvalonError(() => createGame({ ...rule, characters: rule.characters.slice(1) }), "INVALID_RULE")
        expectAvalonError(() => createGame(rule, { characters: rule.characters.slice(1) }), "INVALID_CHARACTERS")
        expectAvalonError(() => createGame(rule, { characters: ["merlin", "merlin", "loyalServant", "morgana", "assassin"] }), "INVALID_CHARACTERS")
        expectAvalonError(() => createGame(rule, { characters: ["merlin", "percival", "loyalServant", "morgana", "bogus" as never] }), "INVALID_CHARACTERS")
        expectAvalonError(() => createGame(rule, { firstLeader: -1 }), "INVALID_FIRST_LEADER")
        expectAvalonError(() => createGame(rule, { firstLeader: 5 }), "INVALID_FIRST_LEADER")
        expectAvalonError(() => createGame(rule, { firstLeader: 1.5 }), "INVALID_FIRST_LEADER")
    })

    it("deals custom characters seat by seat", () => {
        const rule = createRule(5)
        const characters = ["assassin", "merlin", "morgana", "percival", "loyalServant"] as const
        const state = createGame(rule, { characters })
        expect(state.characters).toEqual(characters)
        expect(getSeatsOf(state, "merlin")).toEqual([1])
        expect(getAssassinSeat(state)).toBe(0)
        expect(getSeatsOf(setup(createRule(8)), "loyalServant")).toEqual([2, 3, 4])
    })
})
