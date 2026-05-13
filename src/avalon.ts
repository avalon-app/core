import { Characters, TAlignment, TCharacterKey } from './character';
import {
    CanCreateNewTeam, CreateNextTeam, CreateQuests, InProgressQuest, LastFinishedQuest, RecentTeam,
    TQuest, TTeam
} from './quest';
import {
    isLancelot, RandomLancelotSwitchForRule1, RandomLancelotSwitchForRule2, TRule
} from './rule';
import { randomArray, randomNumberFormRange } from './tools';

/**
 * Represents the state of an Avalon game.
 * 
 * @typedef {Object} TAvalon
 * @property {TRule} rule - The rules of the game.
 * @property {TQuest[]} quests - The list of quests in the game.
 * @property {"quest" | "team" | "ladyOfTheLake" | "excalibur"} stage - The current stage of the game.
 * @property {"goodWin" | "evilWin"} [result] - The result of the game, if it has ended.
 * @property {boolean[]} [lancelotSwitch] - An optional array indicating the state of the Lancelot switch.
 * @property {{ key: TCharacterKey, alignment: TAlignment }[]} players - The list of players, including their character keys and alignments.
 */
export type TAvalon = {
    quests: TQuest[]
    stage: "quest" | "team" | "ladyOfTheLake" | "assassinate" | "end",
    result?: "goodWin" | "evilWin"
    lancelotSwitch?: boolean[]
    lanceLotDidSwitchCount?: number
    players: { key: TCharacterKey, alignment: TAlignment }[]
    kill?: number
}

/**
 * Creates a new Avalon game with the specified rules.
 *
 * @param rule - The rules of the game.
 * @param customCharacters - An optional array of character keys to use instead of randomizing.
 * @returns The initial state of the Avalon game.
 * 
 * This function performs the following actions:
 * 1. Validates the Lancelot configuration.
 * 2. Randomizes the characters for the players.
 * 3. Creates the quests for the game.
 * 4. Sets the initial stage to "team".
 * 5. Sets the initial leader for the game.
 * 6. Returns the initial state of the Avalon game.
 */
export const Create = (rule: TRule, customCharacters?: TCharacterKey[]): TAvalon => {
    if (typeof rule.lancelot === "string" && (!["rule1", "rule2", "rule3"].includes(rule.lancelot) || rule.numberOfPlayer < 7)) {
        throw new Error("Invalid lancelot config")
    }
    const randomCharacters = customCharacters?.length === rule.characters.length ? customCharacters : randomArray(rule.characters)
    let lancelotSwitch: boolean[] | undefined
    if (rule.lancelot === "rule1") {
        lancelotSwitch = RandomLancelotSwitchForRule1()
    } else if (rule.lancelot === "rule2") {
        lancelotSwitch = RandomLancelotSwitchForRule2()
    }
    const firstLeader = randomNumberFormRange(0, rule.numberOfPlayer - 1)
    const avalon: TAvalon = {
        quests: CreateQuests(rule, firstLeader),
        stage: "team",
        players: randomCharacters.flatMap(characterKey => {
            const character = Characters.find(character => character.key === characterKey)
            if (!character) {
                return []
            }
            return { ...character }
        }),
        lancelotSwitch
    };

    updateLancelotAlignment(avalon, rule)

    return avalon;
}

/**
 * Updates the members of the most recent team in the Avalon game.
 *
 * @param avalon - The Avalon game state object.
 * @param members - An array of team members to update the most recent team with.
 * @returns The updated Avalon game state object.
 */
export const UpdateRecentTeamMember = (avalon: TAvalon, members: TTeam["members"]) => {
    if (avalon.stage !== "team") {
        throw new Error("Invalid stage")
    }
    const team = RecentTeam(avalon.quests)
    const quest = InProgressQuest(avalon.quests)
    if (!quest || !team) {
        throw new Error("No in progress quest or team")
    }
    if (quest.numberOfMembers != members.length) {
        throw new Error("Invalid number of team members")
    }

    const containInvalidMember = members.some(v => typeof v != "number" || v >= avalon.players.length || v < 0)

    if (containInvalidMember) {
        throw new Error("Invalid team members")
    }

    if (typeof team.excalibur === "number" && !members.includes(team.excalibur)) {
        team.excalibur = undefined
    }

    team.members = members
}


/**
 * Updates the recent team vote in the Avalon game state.
 *
 * @param avalon - The current state of the Avalon game.
 * @param votes - The votes for the recent team.
 * 
 * @returns The updated Avalon game state if the team is approved or the game has ended.
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
        throw new Error("Invalid stage")
    }
    const quest = InProgressQuest(avalon.quests)
    const team = RecentTeam(avalon.quests)
    if (!quest || !team) {
        throw new Error("No in progress quest or team")
    }
    if (votes.length != rule.numberOfPlayer) {
        throw new Error("Invalid vote count")
    }
    team.votes = votes

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
 * Updates the result of the most recent quest vote in the Avalon game.
 *
 * @param avalon - The current state of the Avalon game.
 * @param votes - An array of boolean values representing the votes for the quest.
 * 
 * @throws {Error} If the number of votes does not match the required number of members for the quest.
 * 
 * The function performs the following steps:
 * 1. Finds the in-progress quest.
 * 2. Validates the number of votes.
 * 3. Determines if the quest has failed based on the number of failure votes.
 * 4. Updates the quest result and state.
 * 5. Checks if the game has ended by counting the number of successful and failed quests.
 * 6. Updates the game stage based on the results of the quests and game rules.
 */
export const UpdateResentQuestVote = (avalon: TAvalon, rule: TRule, votes: boolean[], excaliburTarget?: number) => {
    if (avalon.stage !== "quest") {
        throw new Error("Invalid stage")
    }
    const quest = InProgressQuest(avalon.quests)
    if (!quest) {
        throw new Error("No in progress quest")
    }
    const questIdx = avalon.quests.indexOf(quest)
    if (votes.length != rule.quest.each[questIdx].numberOfMebers) {
        throw new Error("Invalid vote count")
    }
    quest.excaliburTarget = excaliburTarget
    const failuerCount = votes.filter(vote => !vote).length
    const needTwoFailure = rule.quest.each[questIdx].needTwoFailure
    const failed = failuerCount >= (needTwoFailure ? 2 : 1)
    
    quest.result = {
        success: !failed,
        votes
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
        throw new Error("Invalid stage")
    }
    const lastFinishedQuest = LastFinishedQuest(avalon.quests)
    if (!lastFinishedQuest) {
        throw new Error("No last finished quest")
    }
    const questIdx = avalon.quests.indexOf(lastFinishedQuest)
    const ladyOfTheLakes = avalon.quests.flatMap(q => typeof q.ladyOfTheLake === "number" ? [q.ladyOfTheLake] : [])
    if (ladyOfTheLakes.includes(nextLadyOfTheLake)) {
        throw new Error("Invalid next lady of the lake")
    }
    lastFinishedQuest.nextLadyOfTheLake = nextLadyOfTheLake
    avalon.stage = "team"
    avalon.quests[questIdx + 1].state = "inProgress"
    avalon.quests[questIdx + 1].ladyOfTheLake = nextLadyOfTheLake
    CreateNextTeam(avalon.quests, rule)
    /// update Lancelot alignment if needed
    updateLancelotAlignment(avalon, rule)
}

/**
 * Sets the Excalibur for the Avalon game.
 *
 * @param avalon - The current state of the Avalon game.
 * @param excalibur - The player number to be the next Excalibur.
 * @throws Will throw an error if there is no recent team.
 */
export const SetExcalibur = (avalon: TAvalon, excalibur: number) => {
    if (avalon.stage !== "team") {
        throw new Error("Invalid stage")
    }
    const recentTeam = RecentTeam(avalon.quests)
    if (!recentTeam) {
        throw new Error("No recent team")
    }
    recentTeam.excalibur = excalibur
}

export const ChangeToAssassinate = (avalon: TAvalon) => {
    avalon.stage = "assassinate"
}

/**
 * Executes the assassination phase in the Avalon game.
 * 
 * @param avalon - The current state of the Avalon game.
 * @param kill - The index of the player to be assassinated.
 * 
 * @throws {Error} If the current stage is not "assassinate".
 * 
 * @remarks
 * This function updates the game state by setting the `kill` property to the index of the targeted player,
 * changing the stage to "end", and determining the result of the game based on whether the targeted player
 * is Merlin.
 * 
 * @example
 * ```typescript
 * const avalonGame = {
 *   stage: "assassinate",
 *   players: [{ key: "merlin" }, { key: "percival" }, { key: "morgana" }],
 *   kill: null,
 *   result: null
 * };
 * 
 * assassinate(avalonGame, 0);
 * console.log(avalonGame.result); // "evilWin"
 * ```
 */
export const Assassinate = (avalon: TAvalon, kill: number) => {
    if (avalon.stage !== "assassinate") {
        throw new Error("Invalid stage")
    }
    avalon.kill = kill
    const target = avalon.players[kill]
    avalon.stage = "end"
    avalon.result = target.key === "merlin" ? "evilWin" : "goodWin"
}

/**
 * Updates the alignment of Lancelot based on the specified rule.
 *
 * @param avalon - The Avalon game state object.
 * @param rule - The rule object that specifies how Lancelot's alignment should be updated.
 *
 * The function handles two rules for Lancelot's alignment switch:
 * - "rule1": Lancelot switches alignment at the beginning of the third quest.
 * - "rule2": Lancelot switches alignment at the beginning of the game.
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
        throw new Error("No lancelot switch")
    }
    let wantSwitchCount = 0;
    if (rule.lancelot === "rule1") {
        /// Rule 1: Lancelot switches alignment at the beginning of third quest.
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