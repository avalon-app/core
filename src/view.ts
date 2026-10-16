import { Alignment, CharacterKey } from './character';
import { assertState } from './internal';
import { Rule } from './rule';
import { getAlignment, getAssassinSeat, getPendingActions } from './selectors';
import { GameResult, GameState, PendingAction, QuestStatus, Stage } from './types';

/**
 * Someone the viewer learned about at the start of the game through a visibility rule.
 */
export type KnownPlayer = {
    readonly seat: number
    /** The id of the visibility rule that revealed them (e.g. `"merlinSeesEvil"`). */
    readonly via: string
    /** Present when the rule also reveals their exact character. */
    readonly character?: CharacterKey
}

export type TeamView = {
    readonly leader: number
    readonly members: readonly number[]
    readonly excaliburHolder?: number
    /** Who has voted so far (`true` = has voted). */
    readonly voted: readonly boolean[]
    /** Every player's vote — only once the vote has resolved. */
    readonly votes?: readonly boolean[]
    readonly approved?: boolean
}

export type QuestView = {
    readonly teamSize: number
    readonly failsRequired: number
    readonly status: QuestStatus
    readonly teams: readonly TeamView[]
    /** Team members who have played their card, while the quest is being played. */
    readonly playedBy?: readonly number[]
    /** The viewer's own Excalibur decision made while cards are still being played (Excalibur holder only). */
    readonly pendingExcaliburTarget?: number | null
    readonly result?: {
        readonly success: boolean
        readonly failCount: number
        readonly cards: readonly boolean[]
        readonly excalibur?: {
            readonly target: number
            /** Only shown to the Excalibur holder. */
            readonly originalCard?: boolean
        }
    }
}

export type LadyOfTheLakeUseView = {
    readonly afterQuest: number
    readonly holder: number
    readonly target: number
    /** Only shown to the holder who examined the target, and to everyone once the game has ended. */
    readonly alignment?: Alignment
}

/**
 * Everything one seat is allowed to know. Safe to send to that player's client.
 */
export type PlayerView = {
    /** The viewer's seat; undefined for a spectator. */
    readonly seat?: number
    readonly character?: CharacterKey
    /** The viewer's current alignment (Lancelots may switch). */
    readonly alignment?: Alignment
    readonly knownPlayers: readonly KnownPlayer[]
    readonly rule: Rule
    readonly stage: Stage
    readonly leader: number
    readonly quests: readonly QuestView[]
    readonly lancelotDeck?: {
        readonly revealedCards: readonly boolean[]
        readonly remaining: number
    }
    readonly ladyOfTheLake?: {
        readonly holder: number
        readonly uses: readonly LadyOfTheLakeUseView[]
    }
    readonly assassination?: { readonly assassin: number; readonly target: number }
    readonly result?: GameResult
    /** Every seat's character and final alignment — only once the game has ended. */
    readonly players?: readonly { readonly character: CharacterKey; readonly alignment: Alignment }[]
    readonly pendingActions: readonly PendingAction[]
}

const getKnownPlayers = (state: GameState, seat: number): KnownPlayer[] => {
    const viewer = state.characters[seat]
    return state.rule.visibility
        .filter(rule => rule.viewers.includes(viewer))
        .flatMap(rule => state.characters.flatMap((character, other) => {
            if (other === seat || !rule.visible.includes(character)) {
                return []
            }
            const known: KnownPlayer = rule.revealCharacter?.includes(character)
                ? { seat: other, via: rule.id, character }
                : { seat: other, via: rule.id }
            return [known]
        }))
}

/**
 * Projects the full game state onto what one player — or a spectator, when `seat` is omitted — may know:
 * their own character and alignment, what their visibility rules reveal, public game progress, and the results
 * of their own Lady of the Lake and Excalibur uses. Pending votes and played cards stay hidden, and everyone's
 * character is revealed once the game has ended.
 *
 * @throws {AvalonError} `INVALID_STATE` or `INVALID_PLAYER`.
 */
export const getPlayerView = (state: GameState, seat?: number): PlayerView => {
    assertState(state)
    const ended = state.stage === "ended"
    const self = seat === undefined ? undefined : { seat, character: state.characters[seat], alignment: getAlignment(state, seat) }

    const quests: QuestView[] = state.quests.map(quest => {
        const isExcaliburHolder = seat !== undefined && quest.teams.length > 0 && quest.teams[quest.teams.length - 1].excaliburHolder === seat
        return {
            teamSize: quest.teamSize,
            failsRequired: quest.failsRequired,
            status: quest.status,
            teams: quest.teams.map(team => ({
                leader: team.leader,
                members: [...team.members],
                ...(team.excaliburHolder !== undefined ? { excaliburHolder: team.excaliburHolder } : {}),
                voted: team.votes.map(vote => vote !== null),
                ...(team.approved !== undefined ? { votes: team.votes.map(vote => vote === true), approved: team.approved } : {}),
            })),
            ...(quest.pendingCards ? { playedBy: quest.pendingCards.map(card => card.player) } : {}),
            ...(isExcaliburHolder && quest.pendingExcaliburTarget !== undefined ? { pendingExcaliburTarget: quest.pendingExcaliburTarget } : {}),
            ...(quest.result ? {
                result: {
                    success: quest.result.success,
                    failCount: quest.result.failCount,
                    cards: [...quest.result.cards],
                    ...(quest.result.excalibur ? {
                        excalibur: isExcaliburHolder ? { ...quest.result.excalibur } : { target: quest.result.excalibur.target },
                    } : {}),
                },
            } : {}),
        }
    })

    const assassin = getAssassinSeat(state)
    const pendingActions = getPendingActions(state).filter(action => {
        if (action.type === "assassinate") {
            // The assassin may act early in any stage; only the assassin is told so, to keep their identity secret.
            return state.stage === "assassination" || (seat !== undefined && seat === assassin)
        }
        if (action.type === "useExcalibur" && state.stage === "quest") {
            // Whether the holder has already decided during the quest is secret.
            return seat !== undefined && action.players.includes(seat)
        }
        return true
    })

    return {
        ...(self ?? {}),
        knownPlayers: self ? getKnownPlayers(state, self.seat) : [],
        rule: JSON.parse(JSON.stringify(state.rule)),
        stage: state.stage,
        leader: state.leader,
        quests,
        ...(state.lancelotDeck ? {
            lancelotDeck: {
                revealedCards: state.lancelotDeck.cards.slice(0, state.lancelotDeck.revealed),
                remaining: state.lancelotDeck.cards.length - state.lancelotDeck.revealed,
            },
        } : {}),
        ...(state.ladyOfTheLake ? {
            ladyOfTheLake: {
                holder: state.ladyOfTheLake.holder,
                uses: state.ladyOfTheLake.uses.map(use => ended || use.holder === seat
                    ? { ...use }
                    : { afterQuest: use.afterQuest, holder: use.holder, target: use.target }),
            },
        } : {}),
        ...(state.assassination ? { assassination: { ...state.assassination } } : {}),
        ...(state.result ? { result: { ...state.result } } : {}),
        ...(ended ? { players: state.characters.map((character, index) => ({ character, alignment: getAlignment(state, index) })) } : {}),
        pendingActions,
    }
}
