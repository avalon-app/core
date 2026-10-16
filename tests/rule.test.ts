import { CHARACTERS, createRule, getSupportedPlayerCounts, Rule, validateRule } from "../src"
import { expectAvalonError } from "./helpers"

describe("createRule", () => {
    it("builds the 5-player preset", () => {
        expect(createRule(5)).toEqual({
            numberOfPlayers: 5,
            characters: ["merlin", "percival", "loyalServant", "morgana", "assassin"],
            assassin: "assassin",
            quests: [
                { teamSize: 2, failsRequired: 1 },
                { teamSize: 3, failsRequired: 1 },
                { teamSize: 2, failsRequired: 1 },
                { teamSize: 3, failsRequired: 1 },
                { teamSize: 3, failsRequired: 1 },
            ],
            teamProposalLimit: { scope: "quest", max: 5 },
            ladyOfTheLake: false,
            excalibur: false,
            allowEarlyAssassination: false,
            visibility: [
                { id: "merlinSeesEvil", viewers: ["merlin"], visible: ["morgana", "minion", "assassin", "oberon", "lancelotEvil"] },
                { id: "percivalSeesMerlinAndMorgana", viewers: ["percival"], visible: ["merlin", "morgana"] },
                {
                    id: "evilSeesEvil",
                    viewers: ["morgana", "assassin", "mordred", "minion"],
                    visible: ["morgana", "assassin", "mordred", "minion", "lancelotEvil"],
                    revealCharacter: ["lancelotEvil"],
                },
            ],
        })
    })

    it("needs two fails on the 4th quest from 7 players", () => {
        expect(createRule(6).quests[3].failsRequired).toBe(1)
        for (const n of [7, 8, 9, 10]) {
            expect(createRule(n).quests.map(q => q.failsRequired)).toEqual([1, 1, 1, 2, 1])
        }
    })

    it("applies the optional modules", () => {
        const rule = createRule(8, { lancelot: "rule3", ladyOfTheLake: true, excalibur: true, allowEarlyAssassination: true })
        expect(rule).toMatchObject({ lancelot: "rule3", ladyOfTheLake: true, excalibur: true, allowEarlyAssassination: true })
        expect(rule.characters).toContain("lancelotGood")
        expect(rule.characters).toContain("lancelotEvil")
        expect(rule.visibility.map(v => v.id)).toContain("lancelotsSeeEachOther")
        expect(createRule(8, { lancelot: "rule1" }).visibility.map(v => v.id)).not.toContain("lancelotsSeeEachOther")
    })

    it("uses Morgana as the assassin in the 10-player Lancelot preset", () => {
        expect(createRule(10, { lancelot: "rule1" }).assassin).toBe("morgana")
        expect(createRule(10).assassin).toBe("assassin")
    })

    it.each([5, 6, 7, 8, 9, 10])("deals the standard good/evil split for %i players", n => {
        const evil = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 }[n]
        for (const rule of [createRule(n), ...(n >= 7 ? [createRule(n, { lancelot: "rule1" })] : [])]) {
            expect(rule.characters).toHaveLength(n)
            expect(rule.characters.filter(c => CHARACTERS[c].alignment === "evil")).toHaveLength(evil!)
            expect(() => validateRule(rule)).not.toThrow()
        }
    })

    it("returns a fresh copy every time", () => {
        const first = createRule(7, { lancelot: "rule3" }) as unknown as { characters: string[]; quests: { teamSize: number }[]; visibility: { visible: string[] }[] }
        first.characters[0] = "minion"
        first.quests[0].teamSize = 99
        first.visibility[0].visible.push("mordred")
        const second = createRule(7, { lancelot: "rule3" })
        expect(second.characters[0]).toBe("merlin")
        expect(second.quests[0].teamSize).toBe(2)
        expect(second.visibility[0].visible).not.toContain("mordred")
    })

    it("rejects unknown Lancelot variants and unsupported player counts", () => {
        expectAvalonError(() => createRule(7, { lancelot: "rule9" as never }), "INVALID_RULE")
        expectAvalonError(() => createRule(4), "UNSUPPORTED_PLAYER_COUNT")
        expectAvalonError(() => createRule(11), "UNSUPPORTED_PLAYER_COUNT")
        expectAvalonError(() => createRule(6, { lancelot: "rule1" }), "UNSUPPORTED_PLAYER_COUNT")
    })
})

describe("getSupportedPlayerCounts", () => {
    it("lists the presets", () => {
        expect(getSupportedPlayerCounts()).toEqual([5, 6, 7, 8, 9, 10])
        expect(getSupportedPlayerCounts({ lancelot: true })).toEqual([7, 8, 9, 10, 11, 12])
    })
})

describe("validateRule", () => {
    const base = createRule(5)
    const reasonOf = (rule: Rule) => {
        try {
            validateRule(rule)
        } catch (error) {
            return (error as { code: string; details: { reason: string } }).code + ":" + (error as { details: { reason: string } }).details.reason
        }
        return "valid"
    }

    it.each<[string, Rule]>([
        ["numberOfPlayers", { ...base, numberOfPlayers: 1.5 }],
        ["characterCount", { ...base, characters: base.characters.slice(1) }],
        ["unknownCharacter", { ...base, characters: [...base.characters.slice(1), "bogus" as never] }],
        ["duplicateCharacter", { ...base, characters: ["merlin", "merlin", "loyalServant", "morgana", "assassin"] }],
        ["assassin", { ...base, assassin: "merlin" }],
        ["assassin", { ...base, assassin: "mordred" }],
        ["questCount", { ...base, quests: base.quests.slice(1) }],
        ["teamSize", { ...base, quests: base.quests.map(q => ({ ...q, teamSize: 6 })) }],
        ["failsRequired", { ...base, quests: base.quests.map(q => ({ ...q, failsRequired: 0 })) }],
        ["excaliburTeamSize", { ...base, excalibur: true, quests: base.quests.map(q => ({ ...q, teamSize: 1 })) }],
        ["teamProposalLimit", { ...base, teamProposalLimit: { scope: "quest", max: 0 } }],
        ["teamProposalLimit", { ...base, teamProposalLimit: { scope: "round" as never, max: 5 } }],
        ["lancelotCharacters", { ...base, lancelot: "rule1" }],
        ["unknownLancelotVariant", { ...createRule(7, { lancelot: "rule1" }), lancelot: "rule9" as never }],
        ["visibilityId", { ...base, visibility: [...base.visibility, base.visibility[0]] }],
        ["visibilityCharacter", { ...base, visibility: [{ id: "x", viewers: ["bogus" as never], visible: [] }] }],
    ])("rejects %s", (reason, rule) => {
        expect(reasonOf(rule)).toBe(`INVALID_RULE:${reason}`)
    })

    it("accepts every preset", () => {
        for (const n of getSupportedPlayerCounts()) {
            expect(reasonOf(createRule(n, { ladyOfTheLake: true, excalibur: true }))).toBe("valid")
        }
        for (const n of getSupportedPlayerCounts({ lancelot: true })) {
            expect(reasonOf(createRule(n, { lancelot: "rule2" }))).toBe("valid")
        }
    })
})
