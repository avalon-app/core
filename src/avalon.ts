import { Characters, TAlignment, TCharacterKey } from './character';
import { AvalonError } from './error';
import {
    CanCreateNewTeam, CreateNextTeam, CreateQuests, InProgressQuest, LastFinishedQuest, TQuest, TQuestVote, TTeam
} from './quest';
import {
    isCharacterKey, isLancelot, RandomLancelotSwitchForRule1, RandomLancelotSwitchForRule2, TRule, validateRule
} from './rule';
import { randomArray, randomNumberFromRange } from './tools';

/**
 * Represents the state of an Avalon game.
 *
 * @typedef {Object} TAvalon
 * @property {TQuest[]} quests - The list of quests in the game.
 * @property {"team" | "quest" | "ladyOfTheLake" | "assassinate" | "end"} stage - The current stage of the game.
 * @property {"goodWin" | "evilWin"} [result] - The result of the game, if it has ended.
 * @property {boolean[]} [lancelotSwitch] - An optional array indicating the state of the Lancelot switch.
 * @property {number} [lanceLotDidSwitchCount] - Number of Lancelot alignment switches already applied.
 * @property {{ key: TCharacterKey, alignment: TAlignment }[]} players - The list of players, including their character keys and alignments.
 * @property {number} [assassinationTarget] - The seat number of the player chosen during the assassination phase.
 */
export type TAvalon = {
    quests: TQuest[]
    stage: "team" | "quest" | "ladyOfTheLake" | "assassinate" | "end",
    result?: "goodWin" | "evilWin"
    lancelotSwitch?: boolean[]
    lanceLotDidSwitchCount?: number
    players: { key: TCharacterKey, alignment: TAlignment }[]
    assassinationTarget?: number
}

const characterByKey = new Map(Characters.map(c => [c.key, c]))

/**
 * Gets the team currently being proposed/voted on: the last team of the given (in-progress) quest.
 * Unlike `RecentTeam`, it never falls back to a finished quest, so write operations cannot alter history.
 */
const currentTeam = (quest: TQuest): TTeam | undefined => quest.teams[quest.teams.length - 1]

/**
 * Creates a new Avalon game with the specified rules.
 *
 * @param rule - The rules of the game.
 * @param customCharacters - An optional array of character keys, one per seat, to use instead of a random deal.
 * @param firstLeader - An optional seat number of the first leader; chosen randomly when omitted.
 * @returns The initial state of the Avalon game.
 *
 * @throws {AvalonError} `INVALID_RULE`, `INVALID_LANCELOT_CONFIG`, `INVALID_FIRST_LEADER` or `INVALID_CUSTOM_CHARACTERS`
 * when the corresponding argument is invalid.
 *
 * This function performs the following actions:
 * 1. Validates the rule, the Lancelot configuration, the first leader and the custom characters.
 * 2. Deals the characters (custom or randomized) to the players.
 * 3. Creates the quests for the game.
 * 4. Sets the initial stage to "team".
 * 5. Sets the initial leader for the game.
 * 6. Returns the initial state of the Avalon game.
 */
export const Create = (rule: TRule, customCharacters?: TCharacterKey[], firstLeader?: number): TAvalon => {
    validateRule(rule)
    if (typeof rule.lancelot === "string" && (!["rule1", "rule2", "rule3"].includes(rule.lancelot) || rule.numberOfPlayer < 7)) {
        throw new AvalonError("INVALID_LANCELOT_CONFIG", "Invalid lancelot config", { lancelot: rule.lancelot, numberOfPlayer: rule.numberOfPlayer })
    }
    if (typeof firstLeader === "number" && (!Number.isInteger(firstLeader) || firstLeader < 0 || firstLeader >= rule.numberOfPlayer)) {
        throw new AvalonError("INVALID_FIRST_LEADER", "Invalid first leader", { firstLeader, numberOfPlayer: rule.numberOfPlayer })
    }
    if (customCharacters && (customCharacters.length !== rule.numberOfPlayer || !customCharacters.every(isCharacterKey))) {
        throw new AvalonError("INVALID_CUSTOM_CHARACTERS", "Invalid custom characters", { customCharacters, numberOfPlayer: rule.numberOfPlayer })
    }
    const characters = customCharacters ? [...customCharacters] : randomArray(rule.characters)
    let lancelotSwitch: boolean[] | undefined
    if (rule.lancelot === "rule1") {
        lancelotSwitch = RandomLancelotSwitchForRule1()
    } else if (rule.lancelot === "rule2") {
        lancelotSwitch = RandomLancelotSwitchForRule2()
    }
    const leader = typeof firstLeader === "number" ? firstLeader : randomNumberFromRange(0, rule.numberOfPlayer - 1)
    const avalon: TAvalon = {
        quests: CreateQuests(rule, leader),
        stage: "team",
        players: characters.map(characterKey => ({ ...characterByKey.get(characterKey)! })),
        lancelotSwitch
    };

    updateLancelotAlignment(avalon, rule)

    return avalon;
}

/**
 * Updates the members of the team currently being proposed. Mutates `avalon` in place.
 *
 * @param avalon - The Avalon game state object.
 * @param members - The distinct seat numbers of the proposed team members.
 */
export const UpdateRecentTeamMember = (avalon: TAvalon, members: TTeam["members"]) => {
    if (avalon.stage !== "team") {
        throw new AvalonError("INVALID_STAGE", "Invalid stage", { expected: "team", actual: avalon.stage })
    }
    const quest = InProgressQuest(avalon.quests)
    if (!quest) {
        throw new AvalonError("NO_QUEST_IN_PROGRESS", "No quest in progress")
    }
    const team = currentTeam(quest)
    if (!team) {
        throw new AvalonError("NO_TEAM_IN_PROGRESS", "No team in progress")
    }
    if (quest.numberOfMembers != members.length) {
        throw new AvalonError("INVALID_TEAM_MEMBER_COUNT", "Invalid number of team members", { expected: quest.numberOfMembers, actual: members.length })
    }

    const containInvalidMember = members.some(v => !Number.isInteger(v) || v >= avalon.players.length || v < 0)

    if (containInvalidMember) {
        throw new AvalonError("INVALID_TEAM_MEMBER", "Invalid team members", { members, numberOfPlayer: avalon.players.length })
    }
    if (new Set(members).size !== members.length) {
        throw new AvalonError("DUPLICATE_TEAM_MEMBER", "Duplicate team member", { members })
    }

    if (typeof team.excalibur === "number" && !members.includes(team.excalibur)) {
        team.excalibur = undefined
    }

    team.members = [...members]
}


/**
 * Applies the vote on the team currently being proposed. Mutates `avalon` in place.
 *
 * @param avalon - The current state of the Avalon game.
 * @param rule - The rules of the game.
 * @param votes - One vote per player; `vote` must be a boolean (`true` = approve).
 *
 * This function performs the following actions:
 * 1. Finds the in-progress quest and the recent team from the Avalon game state.
 * 2. Updates the team's votes with the provided votes.
 * 3. Checks if the team is approved based on the number of votes.
 * 4. If the team is approved, updates the game stage to "quest".
 * 5. If the team is not approved, checks if a new team can be created.
 * 6. If a new team cannot be created, sets the game result to "evilWin" and updates the stage to "end".
 * 7. If a new team can be created, updates the game stage to "team" and creates the next team.
 */
export const UpdateRecentTeamVote = (avalon: TAvalon, rule: TRule, votes: TTeam["votes"]) => {
    if (avalon.stage !== "team") {
        throw new AvalonError("INVALID_STAGE", "Invalid stage", { expected: "team", actual: avalon.stage })
    }
    const quest = InProgressQuest(avalon.quests)
    if (!quest) {
        throw new AvalonError("NO_QUEST_IN_PROGRESS", "No quest in progress")
    }
    const team = currentTeam(quest)
    if (!team) {
        throw new AvalonError("NO_TEAM_IN_PROGRESS", "No team in progress")
    }
    if (team.members.length !== quest.numberOfMembers) {
        throw new AvalonError("TEAM_NOT_PROPOSED", "Team members have not been proposed", { expected: quest.numberOfMembers, actual: team.members.length })
    }
    if (votes.length != rule.numberOfPlayer) {
        throw new AvalonError("INVALID_VOTE_COUNT", "Invalid vote count", { expected: rule.numberOfPlayer, actual: votes.length })
    }
    const voterSet = new Set<number>()
    for (const v of votes) {
        if (!Number.isInteger(v.player) || v.player < 0 || v.player >= rule.numberOfPlayer) {
            throw new AvalonError("INVALID_VOTER", "Invalid voter", { player: v.player, numberOfPlayer: rule.numberOfPlayer })
        }
        if (voterSet.has(v.player)) {
            throw new AvalonError("DUPLICATE_VOTER", "Duplicate voter", { player: v.player })
        }
        if (typeof v.vote !== "boolean") {
            throw new AvalonError("INVALID_VOTE", "Vote must be a boolean", { player: v.player, vote: v.vote })
        }
        voterSet.add(v.player)
    }
    assertLancelotSwitch(avalon, rule)

    team.votes = votes.map(({ player, vote }) => ({ player, vote }))

    const isTeamApproved = votes.filter(item => item.vote).length * 2 > rule.numberOfPlayer

    if (isTeamApproved) {
        avalon.stage = "quest"
    } else {
        /// Check if the game has ended
        if (!CanCreateNewTeam(avalon.quests, rule)) {
            avalon.result = "evilWin"
            avalon.stage = "end"
            return
        }
        avalon.stage = "team"
        /// create next team
        CreateNextTeam(avalon.quests, rule)
        /// update Lancelot alignment if needed
        updateLancelotAlignment(avalon, rule)
    }
}


/**
 * Applies the quest vote of the approved team. Mutates `avalon` in place.
 *
 * @param avalon - The current state of the Avalon game.
 * @param rule - The rules of the game.
 * @param votes - The quest cards (`true` = success), in one of two forms:
 * - `TQuestVote[]` (recommended): one `{ player, vote }` per team member. The engine applies Excalibur,
 *   records the target's original card and stores the cards without seats (successes first).
 * - `boolean[]`: the final cards, with any Excalibur switch already applied by the caller.
 * @param excaliburTarget - The team member whose card the Excalibur holder switched, if Excalibur was used.
 *
 * @throws {AvalonError} If the stage is wrong, the votes are invalid, or the Excalibur target is not allowed.
 *
 * The function performs the following steps:
 * 1. Finds the in-progress quest.
 * 2. Validates the number of votes.
 * 3. Determines if the quest has failed based on the number of failure votes.
 * 4. Updates the quest result and state.
 * 5. Checks if the game has ended by counting the number of successful and failed quests.
 * 6. Updates the game stage based on the results of the quests and game rules.
 */
export const UpdateRecentQuestVote = (avalon: TAvalon, rule: TRule, votes: boolean[] | TQuestVote[], excaliburTarget?: number) => {
    if (avalon.stage !== "quest") {
        throw new AvalonError("INVALID_STAGE", "Invalid stage", { expected: "quest", actual: avalon.stage })
    }
    const quest = InProgressQuest(avalon.quests)
    if (!quest) {
        throw new AvalonError("NO_QUEST_IN_PROGRESS", "No quest in progress")
    }
    const team = currentTeam(quest)
    if (!team) {
        throw new AvalonError("NO_TEAM_IN_PROGRESS", "No team in progress")
    }
    const questIdx = avalon.quests.indexOf(quest)
    /// The quest snapshot taken at creation is the source of truth for its size and failure threshold.
    if (votes.length != quest.numberOfMembers) {
        throw new AvalonError("INVALID_VOTE_COUNT", "Invalid vote count", { expected: quest.numberOfMembers, actual: votes.length })
    }
    const usesExcalibur = excaliburTarget != null
    if (usesExcalibur) {
        validateExcaliburTarget(rule, team, excaliburTarget)
    }
    const { cards, originalVote } = resolveQuestCards(team, votes, excaliburTarget)
    assertLancelotSwitch(avalon, rule)

    quest.excaliburTarget = usesExcalibur ? excaliburTarget : undefined
    quest.excaliburOriginalVote = originalVote
    const failureCount = cards.filter(card => !card).length
    const failed = failureCount >= (quest.needTwoFailure ? 2 : 1)

    quest.result = {
        success: !failed,
        votes: cards
    }
    quest.state = "finished"

    /// Check if the game has ended
    const goodWinCount = avalon.quests.filter(q => q.result?.success === true).length
    const evilWinCount = avalon.quests.filter(q => q.result?.success === false).length

    if (goodWinCount === 3) {
        avalon.stage = "assassinate"
    } else if (evilWinCount === 3) {
        avalon.result = "evilWin"
        avalon.stage = "end"
    } else if (!CanCreateNewTeam(avalon.quests, rule)) {
        /// The team-proposal cap (e.g. in "whole" mode) is exhausted, so no team can be formed for the next quest.
        avalon.result = "evilWin"
        avalon.stage = "end"
    } else {
        if (rule.hasLadyOfTheLake && questIdx >= 1 && typeof quest.nextLadyOfTheLake != "number") {
            avalon.stage = "ladyOfTheLake"
        } else {
            avalon.stage = "team"
            avalon.quests[questIdx + 1].state = "inProgress"
            CreateNextTeam(avalon.quests, rule)
            /// update Lancelot alignment if needed
            updateLancelotAlignment(avalon, rule)
        }
    }
}

/**
 * Sets the next Lady of the Lake for the Avalon game.
 *
 * @param avalon - The current state of the Avalon game.
 * @param nextLadyOfTheLake - The player number to be the next Lady of the Lake.
 * @throws Will throw an error if there is no last finished quest.
 * @throws Will throw an error if the next Lady of the Lake has already been a Lady of the Lake.
 */
export const SetNextLadyOfTheLake = (avalon: TAvalon, rule: TRule, nextLadyOfTheLake: number) => {
    if (avalon.stage !== "ladyOfTheLake") {
        throw new AvalonError("INVALID_STAGE", "Invalid stage", { expected: "ladyOfTheLake", actual: avalon.stage })
    }
    if (!Number.isInteger(nextLadyOfTheLake) || nextLadyOfTheLake < 0 || nextLadyOfTheLake >= rule.numberOfPlayer) {
        throw new AvalonError("INVALID_LADY_OF_THE_LAKE", "Invalid next lady of the lake", { nextLadyOfTheLake, numberOfPlayer: rule.numberOfPlayer })
    }
    const lastFinishedQuest = LastFinishedQuest(avalon.quests)
    if (!lastFinishedQuest) {
        throw new AvalonError("NO_LAST_FINISHED_QUEST", "No last finished quest")
    }
    const questIdx = avalon.quests.indexOf(lastFinishedQuest)
    const ladyOfTheLakes = avalon.quests.flatMap(q => typeof q.ladyOfTheLake === "number" ? [q.ladyOfTheLake] : [])
    if (ladyOfTheLakes.includes(nextLadyOfTheLake)) {
        throw new AvalonError("LADY_OF_THE_LAKE_ALREADY_HELD", "Next lady of the lake has already held the role", { nextLadyOfTheLake })
    }
    if (!CanCreateNewTeam(avalon.quests, rule)) {
        throw new AvalonError("CANNOT_CREATE_NEW_TEAM", "Cannot create new team")
    }
    assertLancelotSwitch(avalon, rule)

    lastFinishedQuest.nextLadyOfTheLake = nextLadyOfTheLake
    avalon.stage = "team"
    avalon.quests[questIdx + 1].state = "inProgress"
    avalon.quests[questIdx + 1].ladyOfTheLake = nextLadyOfTheLake
    CreateNextTeam(avalon.quests, rule)
    /// update Lancelot alignment if needed
    updateLancelotAlignment(avalon, rule)
}

/**
 * Hands Excalibur to a member of the team currently being proposed. Mutates `avalon` in place.
 *
 * @param avalon - The current state of the Avalon game.
 * @param rule - The rules of the game.
 * @param holder - The seat number of the team member (other than the leader) who receives Excalibur.
 * @throws {AvalonError} If Excalibur is disabled, the stage is wrong, or the holder is not a non-leader team member.
 */
export const SetExcalibur = (avalon: TAvalon, rule: TRule, holder: number) => {
    if (!rule.enableExcalibur) {
        throw new AvalonError("EXCALIBUR_DISABLED", "Excalibur is not enabled")
    }
    if (avalon.stage !== "team") {
        throw new AvalonError("INVALID_STAGE", "Invalid stage", { expected: "team", actual: avalon.stage })
    }
    const quest = InProgressQuest(avalon.quests)
    const recentTeam = quest && currentTeam(quest)
    if (!recentTeam) {
        throw new AvalonError("NO_RECENT_TEAM", "No recent team")
    }
    if (!recentTeam.members.includes(holder)) {
        throw new AvalonError("EXCALIBUR_NOT_TEAM_MEMBER", "Excalibur holder must be a current team member", { excalibur: holder, members: recentTeam.members })
    }
    if (holder === recentTeam.leader) {
        throw new AvalonError("EXCALIBUR_IS_LEADER", "Excalibur holder cannot be the team leader", { excalibur: holder })
    }
    recentTeam.excalibur = holder
}

/**
 * Forces the Avalon game into the assassination stage.
 *
 * @param avalon - The current state of the Avalon game.
 *
 * @throws {AvalonError} If the game has already ended.
 */
export const ChangeToAssassinate = (avalon: TAvalon) => {
    if (avalon.stage === "end") {
        throw new AvalonError("INVALID_STAGE", "Invalid stage", { expected: ["team", "quest", "ladyOfTheLake", "assassinate"], actual: avalon.stage })
    }
    avalon.stage = "assassinate"
}

/**
 * Executes the assassination phase in the Avalon game.
 *
 * @param avalon - The current state of the Avalon game.
 * @param target - The seat number of the player to be assassinated.
 *
 * @throws {Error} If the current stage is not "assassinate" or the target is out of range.
 */
export const Assassinate = (avalon: TAvalon, target: number) => {
    if (avalon.stage !== "assassinate") {
        throw new AvalonError("INVALID_STAGE", "Invalid stage", { expected: "assassinate", actual: avalon.stage })
    }
    if (!Number.isInteger(target) || target < 0 || target >= avalon.players.length) {
        throw new AvalonError("INVALID_ASSASSINATION_TARGET", "Invalid assassination target", { target, numberOfPlayer: avalon.players.length })
    }
    avalon.assassinationTarget = target
    avalon.stage = "end"
    avalon.result = avalon.players[target].key === "merlin" ? "evilWin" : "goodWin"
}

/**
 * Validates the Excalibur target used during the quest vote: Excalibur must be enabled and assigned,
 * and the target must be another member of the team.
 */
const validateExcaliburTarget = (rule: TRule, team: TTeam, excaliburTarget: number) => {
    if (!rule.enableExcalibur) {
        throw new AvalonError("EXCALIBUR_DISABLED", "Excalibur is not enabled")
    }
    if (typeof team.excalibur !== "number") {
        throw new AvalonError("EXCALIBUR_NOT_ASSIGNED", "Excalibur has not been assigned to a team member")
    }
    if (!team.members.includes(excaliburTarget) || excaliburTarget === team.excalibur) {
        throw new AvalonError("INVALID_EXCALIBUR_TARGET", "Excalibur target must be another member of the team", { excaliburTarget, holder: team.excalibur, members: team.members })
    }
}

const isQuestVoteList = (votes: boolean[] | TQuestVote[]): votes is TQuestVote[] => {
    return votes.every(vote => typeof vote === "object" && vote !== null)
}

/**
 * Turns the submitted quest votes into the revealed cards.
 *
 * - `boolean[]` is taken as the final cards; any Excalibur switch was already applied by the caller.
 * - `TQuestVote[]` must contain exactly one vote per team member. The engine switches the Excalibur
 *   target's card, then drops the seats and orders successes first so the cards never reveal who played what.
 */
const resolveQuestCards = (team: TTeam, votes: boolean[] | TQuestVote[], excaliburTarget?: number) => {
    if (!isQuestVoteList(votes)) {
        if (votes.some(vote => typeof vote !== "boolean")) {
            throw new AvalonError("INVALID_VOTE", "Vote must be a boolean", { votes })
        }
        return { cards: [...votes], originalVote: undefined }
    }
    const voters = new Set<number>()
    const cards: boolean[] = []
    let originalVote: boolean | undefined
    for (const { player, vote } of votes) {
        if (!team.members.includes(player)) {
            throw new AvalonError("INVALID_VOTER", "Quest voter must be a team member", { player, members: team.members })
        }
        if (voters.has(player)) {
            throw new AvalonError("DUPLICATE_VOTER", "Duplicate voter", { player })
        }
        if (typeof vote !== "boolean") {
            throw new AvalonError("INVALID_VOTE", "Vote must be a boolean", { player, vote })
        }
        voters.add(player)
        if (player === excaliburTarget) {
            originalVote = vote
        }
        cards.push(player === excaliburTarget ? !vote : vote)
    }
    return { cards: cards.sort((a, b) => Number(b) - Number(a)), originalVote }
}

/**
 * Ensures the Lancelot switch pile exists when the rule needs it.
 * Transitions call this before mutating any state so a missing pile never leaves the game half-updated.
 *
 * @throws {AvalonError} If the Lancelot switch is not defined while rule1/rule2 is active.
 */
const assertLancelotSwitch = (avalon: TAvalon, rule: TRule) => {
    if ((rule.lancelot === "rule1" || rule.lancelot === "rule2") && !avalon.lancelotSwitch) {
        throw new AvalonError("MISSING_LANCELOT_SWITCH", "Missing lancelot switch")
    }
}

/**
 * Updates the alignment of Lancelot based on the specified rule.
 *
 * @param avalon - The Avalon game state object.
 * @param rule - The rule object that specifies how Lancelot's alignment should be updated.
 *
 * The function handles two rules for Lancelot's alignment switch:
 * - "rule1": from the third quest on, one card is revealed for every team proposal (re-proposals included).
 * - "rule2": one card is revealed at the beginning of every quest, starting with the first.
 *
 * If the rule is not "rule1" or "rule2", the function returns without making any changes.
 * If the Lancelot switch is not defined in the Avalon game state, an error is thrown.
 *
 * The function calculates the number of times Lancelot should have switched alignment
 * based on the specified rule and the current state of the game. If the number of
 * switches is odd, Lancelot's alignment is toggled for all players who are Lancelot.
 *
 * @throws {Error} If the Lancelot switch is not defined in the Avalon game state.
 */
const updateLancelotAlignment = (avalon: TAvalon, rule: TRule) => {
    if (rule.lancelot !== "rule1" && rule.lancelot !== "rule2") {
        return;
    }
    const lancelotSwitch = avalon.lancelotSwitch;

    if (!lancelotSwitch) {
        throw new AvalonError("MISSING_LANCELOT_SWITCH", "Missing lancelot switch")
    }
    let wantSwitchCount = 0;
    if (rule.lancelot === "rule1") {
        /// Rule 1: from the third quest on, every team proposal (including re-proposals) reveals one card.
        const teams = avalon.quests.slice(2).flatMap(q => q.teams);
        wantSwitchCount = lancelotSwitch.slice(0, teams.length).filter(v => v).length;
    }
    if (rule.lancelot === "rule2") {
        /// Rule 2: Lancelot switches alignment at the beginning of the game.
        const step = avalon.quests.filter(q => q.state === "inProgress" || q.state == "finished").length
        wantSwitchCount = lancelotSwitch.slice(0, step).filter(v => v).length 
    }

    const lanceLotDidSwitchCount = avalon.lanceLotDidSwitchCount || 0;

    if ((wantSwitchCount - lanceLotDidSwitchCount) % 2 === 1) {
        avalon.players.filter(p => isLancelot(p.key)).forEach(p => {
            p.alignment = p.alignment === "good" ? "evil" : "good"
        })
        avalon.lanceLotDidSwitchCount = wantSwitchCount;
    }
}