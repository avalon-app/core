import { TAvalon } from './avalon';
import { RecentTeam as recentTeam } from './quest';

export { Create as CreateAvalon, UpdateRecentTeamMember, UpdateRecentTeamVote, UpdateRecentQuestVote, SetNextLadyOfTheLake, Assassinate, SetExcalibur, ChangeToAssassinate } from "./avalon"
export { defaultRuleForNumberOfPlayer as DefaultRuleForNumberOfPlayer, SupportNumberOfPlayer } from "./rule"
export const RecentTeam = (avalon: TAvalon) => {
    return recentTeam(avalon.quests)
}
export { Characters, TAlignment, TCharacterKey } from "./character"
export { AvalonError } from "./error"
export type { TAvalonErrorCode } from "./error"
export type { TAvalon } from "./avalon"
export type { TQuest, TTeam } from "./quest"
export type { TRule } from "./rule"