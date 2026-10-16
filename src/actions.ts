import { AvalonError } from './error';
import {
    afterQuestResolved, assertSeat, assertState, beginNextQuest, canAssassinate, cloneState, DraftState, endGame, isSeat,
    isTeamProposalLimitReached, nextSeat, startTeamBuilding
} from './internal';
import { getAlignment, getAssassinSeat, getCurrentQuestIndex } from './selectors';
import { GameAction, GameState, Stage } from './types';

type ActionOf<T extends GameAction["type"]> = Extract<GameAction, { type: T }>

const expectStage = (draft: DraftState, action: GameAction, stages: readonly Stage[]) => {
    if (!stages.includes(draft.stage)) {
        throw new AvalonError("INVALID_STAGE", `Cannot ${action.type} during ${draft.stage}`, { action: action.type, expected: stages, actual: draft.stage })
    }
}

const expectActor = (draft: DraftState, action: GameAction, allowed: readonly number[]) => {
    assertSeat(draft, action.player)
    if (!allowed.includes(action.player)) {
        throw new AvalonError("PLAYER_CANNOT_ACT", `Player ${action.player} cannot ${action.type} now`, { action: action.type, player: action.player, allowed })
    }
}

const expectBoolean = (value: unknown, details: Record<string, unknown>) => {
    if (typeof value !== "boolean") {
        throw new AvalonError("INVALID_VOTE", "Votes and quest cards must be booleans", details)
    }
}

/** The active quest and its latest team, which exist in every stage these handlers accept. */
const currentQuestAndTeam = (draft: DraftState) => {
    const questIndex = getCurrentQuestIndex(draft)
    const quest = draft.quests[questIndex]
    return { questIndex, quest, team: quest.teams[quest.teams.length - 1] }
}

const proposeTeam = (draft: DraftState, action: ActionOf<"proposeTeam">) => {
    expectStage(draft, action, ["teamBuilding"])
    expectActor(draft, action, [draft.leader])
    const { quest } = currentQuestAndTeam(draft)
    const { members, excaliburHolder } = action

    if (!Array.isArray(members) || members.length !== quest.teamSize) {
        throw new AvalonError("INVALID_TEAM_SIZE", `The team must have ${quest.teamSize} members`, { expected: quest.teamSize, actual: Array.isArray(members) ? members.length : members })
    }
    if (!members.every(member => isSeat(draft, member))) {
        throw new AvalonError("INVALID_TEAM_MEMBER", "Team members must be valid seats", { members })
    }
    if (new Set(members).size !== members.length) {
        throw new AvalonError("DUPLICATE_TEAM_MEMBER", "Team members must be distinct", { members })
    }
    if (draft.rule.excalibur) {
        if (excaliburHolder == null) {
            throw new AvalonError("EXCALIBUR_HOLDER_REQUIRED", "The leader must give Excalibur to a team member")
        }
        if (!members.includes(excaliburHolder) || excaliburHolder === draft.leader) {
            throw new AvalonError("INVALID_EXCALIBUR_HOLDER", "Excalibur must go to a team member other than the leader", { excaliburHolder, members, leader: draft.leader })
        }
    } else if (excaliburHolder != null) {
        throw new AvalonError("EXCALIBUR_DISABLED", "Excalibur is not part of this game")
    }

    quest.teams.push({
        leader: draft.leader,
        members: [...members],
        ...(excaliburHolder != null ? { excaliburHolder } : {}),
        votes: draft.characters.map(() => null),
    })
    draft.stage = "teamVote"
}

const voteTeam = (draft: DraftState, action: ActionOf<"voteTeam">) => {
    expectStage(draft, action, ["teamVote"])
    assertSeat(draft, action.player)
    expectBoolean(action.approve, { player: action.player, approve: action.approve })
    const { questIndex, quest, team } = currentQuestAndTeam(draft)
    if (team.votes[action.player] !== null) {
        throw new AvalonError("ALREADY_ACTED", `Player ${action.player} has already voted`, { action: action.type, player: action.player })
    }
    team.votes[action.player] = action.approve
    if (team.votes.includes(null)) {
        return
    }

    const approvals = team.votes.filter(vote => vote === true).length
    team.approved = approvals * 2 > team.votes.length
    if (team.approved) {
        draft.stage = "quest"
        quest.pendingCards = []
    } else if (isTeamProposalLimitReached(draft, questIndex)) {
        endGame(draft, "evil", "teamProposalLimitReached")
    } else {
        draft.leader = nextSeat(draft.leader, draft.characters.length)
        startTeamBuilding(draft, questIndex, false)
    }
}

const playQuestCard = (draft: DraftState, action: ActionOf<"playQuestCard">) => {
    expectStage(draft, action, ["quest"])
    const { questIndex, quest, team } = currentQuestAndTeam(draft)
    expectActor(draft, action, team.members)
    expectBoolean(action.success, { player: action.player, success: action.success })
    const pendingCards = quest.pendingCards ?? []
    if (pendingCards.some(card => card.player === action.player)) {
        throw new AvalonError("ALREADY_ACTED", `Player ${action.player} has already played a card`, { action: action.type, player: action.player })
    }
    if (!action.success && getAlignment(draft, action.player) === "good") {
        throw new AvalonError("GOOD_MUST_SUCCEED", "Good players must play success cards", { player: action.player })
    }
    pendingCards.push({ player: action.player, success: action.success })
    quest.pendingCards = pendingCards
    if (pendingCards.length < team.members.length) {
        return
    }
    if (team.excaliburHolder !== undefined && quest.pendingExcaliburTarget === undefined) {
        // The holder has not decided yet: wait for them.
        draft.stage = "excalibur"
    } else {
        resolveQuest(draft, questIndex, quest.pendingExcaliburTarget ?? null)
    }
}

const useExcalibur = (draft: DraftState, action: ActionOf<"useExcalibur">) => {
    expectStage(draft, action, ["quest", "excalibur"])
    if (!draft.rule.excalibur) {
        throw new AvalonError("EXCALIBUR_DISABLED", "Excalibur is not part of this game")
    }
    const { questIndex, quest, team } = currentQuestAndTeam(draft)
    const holder = team.excaliburHolder as number
    expectActor(draft, action, [holder])
    if (quest.pendingExcaliburTarget !== undefined) {
        throw new AvalonError("ALREADY_ACTED", `Player ${action.player} has already decided on Excalibur`, { action: action.type, player: action.player })
    }
    const target = action.target ?? null
    if (target !== null && (!team.members.includes(target) || target === holder)) {
        throw new AvalonError("INVALID_EXCALIBUR_TARGET", "Excalibur must target another team member", { target, holder, members: team.members })
    }
    if (draft.stage === "quest") {
        // Decided while cards are still being played: keep it secret and apply it when the last card is in.
        quest.pendingExcaliburTarget = target
        return
    }
    resolveQuest(draft, questIndex, target)
}

const resolveQuest = (draft: DraftState, questIndex: number, excaliburTarget: number | null) => {
    const quest = draft.quests[questIndex]
    const played = quest.pendingCards ?? []
    const cards = played.map(card => card.player === excaliburTarget ? !card.success : card.success)
    const targetCard = played.find(card => card.player === excaliburTarget)
    const failCount = cards.filter(card => !card).length
    const success = failCount < quest.failsRequired

    quest.status = success ? "succeeded" : "failed"
    quest.result = {
        success,
        failCount,
        // Successes first: the stored cards must not reveal who played what.
        cards: cards.sort((a, b) => Number(b) - Number(a)),
        ...(targetCard ? { excalibur: { target: targetCard.player, originalCard: targetCard.success } } : {}),
    }
    delete quest.pendingCards
    delete quest.pendingExcaliburTarget
    afterQuestResolved(draft, questIndex)
}

const useLadyOfTheLake = (draft: DraftState, action: ActionOf<"useLadyOfTheLake">) => {
    expectStage(draft, action, ["ladyOfTheLake"])
    const lady = draft.ladyOfTheLake!
    expectActor(draft, action, [lady.holder])
    const { target } = action
    if (!isSeat(draft, target)) {
        throw new AvalonError("INVALID_LADY_OF_THE_LAKE_TARGET", "The Lady of the Lake must examine a valid seat", { target, reason: "invalidSeat" })
    }
    const formerHolders = [lady.holder, ...lady.uses.map(use => use.holder)]
    if (formerHolders.includes(target)) {
        throw new AvalonError("INVALID_LADY_OF_THE_LAKE_TARGET", "The Lady of the Lake cannot examine a current or former holder", { target, formerHolders, reason: "formerHolder" })
    }
    const afterQuest = draft.quests.reduce((last, quest, index) => quest.status === "succeeded" || quest.status === "failed" ? index : last, -1)
    lady.uses.push({ afterQuest, holder: lady.holder, target, alignment: getAlignment(draft, target) })
    lady.holder = target
    beginNextQuest(draft, afterQuest + 1)
}

const assassinate = (draft: DraftState, action: ActionOf<"assassinate">) => {
    const allowedStages: Stage[] = draft.rule.allowEarlyAssassination
        ? ["teamBuilding", "teamVote", "quest", "excalibur", "ladyOfTheLake", "assassination"]
        : ["assassination"]
    expectStage(draft, action, allowedStages)
    const assassin = getAssassinSeat(draft)
    if (assassin === undefined || !canAssassinate(draft)) {
        throw new AvalonError("INVALID_STAGE", "There is nobody to assassinate in this game", { action: action.type, actual: draft.stage })
    }
    expectActor(draft, action, [assassin])
    const { target } = action
    if (!isSeat(draft, target) || target === assassin) {
        throw new AvalonError("INVALID_ASSASSINATION_TARGET", "The assassin must target another valid seat", { target, assassin })
    }
    draft.assassination = { assassin, target }
    const hit = draft.characters[target] === "merlin"
    endGame(draft, hit ? "evil" : "good", hit ? "merlinAssassinated" : "assassinationMissed")
}

/**
 * Applies a player's move and returns the next state. The given state is never modified; when the move is illegal
 * an `AvalonError` is thrown and nothing changes.
 *
 * @throws {AvalonError} `INVALID_STATE`, `UNKNOWN_ACTION`, `INVALID_STAGE`, `INVALID_PLAYER`, `PLAYER_CANNOT_ACT`,
 * `ALREADY_ACTED` or a move-specific code.
 */
export const applyAction = (state: GameState, action: GameAction): GameState => {
    assertState(state)
    const draft = cloneState(state)
    switch (action?.type) {
        case "proposeTeam": proposeTeam(draft, action); break
        case "voteTeam": voteTeam(draft, action); break
        case "playQuestCard": playQuestCard(draft, action); break
        case "useExcalibur": useExcalibur(draft, action); break
        case "useLadyOfTheLake": useLadyOfTheLake(draft, action); break
        case "assassinate": assassinate(draft, action); break
        default:
            throw new AvalonError("UNKNOWN_ACTION", "Unknown action type", { type: (action as { type?: unknown } | undefined)?.type })
    }
    return draft
}
