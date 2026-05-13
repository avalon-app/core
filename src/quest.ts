import { TRule } from './rule';

/**
 * Represents a quest in the game.
 */
export type TQuest = {
    /**
     * The teams participating in the quest.
     */
    teams: TTeam[]
    /**
     * The number of members required for the quest.
     */
    numberOfMembers: number
    /**
     * The current state of the quest.
     */
    state: "finished" | "inProgress" | "notStarted"
    /**
     * Indicates if the quest needs two failures to fail.
     */
    needTwoFailure?: true
    /**
     * The seat number of the player with the Lady of the Lake card.
     */
    ladyOfTheLake?: number
    /**
     * The seat number of the next player to receive the Lady of the Lake card.
     */
    nextLadyOfTheLake?: number
    /**
     * The seat number of the player targeted by Excalibur.
     */
    excaliburTarget?: number
    /**
     * The result of the quest.
     */
    result?: {
        /**
         * Indicates if the quest was successful.
         */
        success: boolean
        /**
         * The votes cast for the quest.
         */
        votes: boolean[]
    }
}

/**
 * Represents a team in the quest.
 */
export type TTeam = {
    /**
     * The seat numbers of the team members.
     */
    members: number[]
    /**
     * The seat number of the team leader.
     */
    leader: number
    /**
     * The votes cast by the team members.
     */
    votes: { vote: boolean, player: number }[]
    /**
     * The seat number of the player own Excalibur.
     */
    excalibur?: number
}

/**
 * Gets the previous player in the sequence.
 * @param seat The current player's seat number.
 * @param numberOfPlayer The total number of players.
 * @returns The seat number of the previous player.
 */
const previewPlayer = (seat: number, numberOfPlayer: number) => {
    return (seat + numberOfPlayer - 1) % numberOfPlayer
}

/**
 * Gets the next player in the sequence.
 * @param seat The current player's seat number.
 * @param numberOfPlayer The total number of players.
 * @returns The seat number of the next player.
 */
const nextPlayer = (seat: number, numberOfPlayer: number) => {
    return (seat + 1) % numberOfPlayer
}

/**
 * Creates initial quests based on the given rule and leader.
 * @param rule The current rule applied to the game.
 * @param leader The seat number of the first leader.
 * @returns An array of initial quests.
 * @throws Will throw an error if the leader parameter is invalid.
 */
export const CreateQuests = (rule: TRule, leader: number): TQuest[] => {
    if (leader < 0 || leader >= rule.numberOfPlayer) {
        throw new Error("Invalid leader parameter")
    }
    return [0, 1, 2, 3, 4].map(idx => {
        const ladyOfTheLake = rule.hasLadyOfTheLake && idx === 1 ? previewPlayer(leader, rule.numberOfPlayer) : undefined
        return {
            teams: idx === 0 ? [{
                leader: leader,
                votes: [],
                members: []
            }] : [],
            numberOfMembers: rule.quest.each[idx].numberOfMebers,
            ladyOfTheLake,
            state: idx === 0 ? "inProgress" : "notStarted",
            needTwoFailure: rule.quest.each[idx].needTwoFailure
        }
    })
}

/**
 * Finds the quest that is currently in progress.
 * @param quests The array of quests.
 * @returns The quest that is in progress, or undefined if none are in progress.
 */
export const InProgressQuest = (quests: TQuest[]) => {
    return quests.find(q => q.state === "inProgress")
}

/**
 * Gets the most recent team from the quest that is in progress.
 * @param quests The array of quests.
 * @returns The most recent team, or undefined if no team is found.
 */
export const RecentTeam = (quests: TQuest[]) => {
    const quest = InProgressQuest(quests)
    if (quest && quest.teams.length) {
        const length = quest.teams.length
        return quest.teams[length - 1]
    } else {
        const lastFinished = LastFinishedQuest(quests)
        return lastFinished ? lastFinished.teams[lastFinished.teams.length - 1] : undefined
    }
}

/**
 * Finds the last finished quest.
 * @param quests The array of quests.
 * @returns The last finished quest, or undefined if none are finished.
 */
export const LastFinishedQuest = (quests: TQuest[]) => {
    return [...quests].reverse().find(q => q.state === "finished")
}

/**
 * Finds the first quest that has not started.
 * @param quests The array of quests.
 * @returns The first quest that has not started, or undefined if all quests have started.
 */
export const FirstUnStartedQuest = (quests: TQuest[]) => {
    return quests.find(q => q.state === "notStarted")
}

/**
 * Updates the recent team members in the game.
 * @param quests The array of quests.
 * @param members The seat numbers of the team members.
 * @throws Will throw an error if the recent team is not found.
 */
export const CreateNextTeam = (quests: TQuest[], rule: TRule) => {
    if (!CanCreateNewTeam(quests, rule)) {
        throw new Error("Cannot create new team")
    }
    const quest = InProgressQuest(quests)
    if (!quest) {
        throw new Error("No quest in progress")
    }
    /// add in current quest
    const team = RecentTeam(quests)
    if (!team) {
        throw new Error("No team in progress")
    }
    const lastLeader = team.leader
    quest.teams.push({
        leader: nextPlayer(lastLeader, rule.numberOfPlayer),
        votes: [],
        members: []
    })
}


/**
 * Determines if a new team can be created based on the given quests and rule.
 *
 * @param quests - An array of quests of type `TQuest`.
 * @param rule - The rule of type `TRule` that defines the conditions for creating a new team.
 * @returns A boolean indicating whether a new team can be created.
 *
 * The function checks the mode of the quest team in the rule:
 * - If the mode is "each", it checks if there is an in-progress quest. If not, it checks for an unstarted quest.
 *   If there is an unstarted quest, it returns true. If the number of teams in the in-progress quest
 *   exceeds the maximum count of summon teams defined in the rule, it returns false.
 * - If the mode is "whole", it calculates the total number of teams across all quests that are not in the "notStarted" state.
 *   If this total exceeds the maximum count of summon teams defined in the rule, it returns false.
 * 
 * In all other cases, it returns true.
 */
export const CanCreateNewTeam = (quests: TQuest[], rule: TRule) => {
    if (rule.quest.team.mode === "each") {
        const quest = InProgressQuest(quests)
        if (!quest) {
            const unstartedQuest = FirstUnStartedQuest(quests)
            return !!unstartedQuest
        }
        if (quest.teams.length >= rule.quest.team.maxCountOfSummonTeam) {
            return false
        }
    } else if (rule.quest.team.mode === "whole") {
        const current = quests.filter(q => q.state !== "notStarted").reduce((acc, q) => {
            return acc + q.teams.length - 1
        }, 0)
        if (current >= rule.quest.team.maxCountOfSummonTeam) {
            return false
        }
    }

    return true
}