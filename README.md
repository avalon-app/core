# Avalon Core

[English](./README.md) · [简体中文](./README.zh-CN.md)

A framework-agnostic TypeScript game engine for *The Resistance: Avalon*. It deals the characters, runs team building, votes, quests, Lady of the Lake, Excalibur, the Lancelot variants and the assassination, decides who wins — and tells each player only what they are allowed to know. The UI and networking are up to you.

- **Package**: `@avalon-app/core`
- **License**: MIT
- **Node**: >= 22 (the published code is ES2019 and runs in browsers and mini-game runtimes too)

## Installation

```bash
npm install @avalon-app/core
# or
pnpm add @avalon-app/core
```

## Features

- **Rule presets for 5–12 players** (11 and 12 players with Lancelot only), plus validation for hand-built rules.
- **Pure, immutable reducer**: `applyAction(state, action)` returns a new state. An illegal move throws an `AvalonError` and changes nothing.
- **Self-contained, JSON-serialisable state**: the game keeps its own copy of the rule, so it can be stored, sent over the network and restored as-is.
- **The engine enforces the rules**: every move names the acting seat, and the engine checks that this seat may act now (leader, voter, team member, Excalibur or Lady of the Lake holder, assassin). Good players cannot play fail cards.
- **Per-player views**: `getPlayerView(state, seat)` hides other players' characters, pending votes, who played which quest card, and the private results of Lady of the Lake and Excalibur.
- **Optional modules**: Lady of the Lake, Excalibur, three Lancelot variants, early assassination.
- **Injectable randomness**: unpredictable by default (Web Crypto), seedable for tests and replays.

## Quick Start

```typescript
import { applyAction, createGame, createRule, getPendingActions, getPlayerView } from "@avalon-app/core";

const rule = createRule(7, { ladyOfTheLake: true });
let game = createGame(rule); // characters and first leader are random

// The leader proposes a team.
game = applyAction(game, { type: "proposeTeam", player: game.leader, members: [0, 1] });

// Every player votes, in any order.
for (let player = 0; player < rule.numberOfPlayers; player++) {
  game = applyAction(game, { type: "voteTeam", player, approve: true });
}

// The team members play their quest cards.
game = applyAction(game, { type: "playQuestCard", player: 0, success: true });
game = applyAction(game, { type: "playQuestCard", player: 1, success: true });

getPendingActions(game); // [{ type: "proposeTeam", players: [<next leader>] }]
getPlayerView(game, 3);  // everything seat 3 may know — send this to their client
```

## Recommended Architecture

The full `GameState` contains secrets (every character, unrevealed Lancelot cards, votes in progress), so keep it on the server (or the host device) and never send it to players.

```typescript
import { applyAction, getPlayerView, isAvalonError, GameAction } from "@avalon-app/core";

function onPlayerMove(seat: number, move: GameAction) {
  try {
    // Always use the authenticated seat, never one sent by the client.
    state = applyAction(state, { ...move, player: seat });
  } catch (error) {
    if (isAvalonError(error)) return reply(seat, { error: error.code, details: error.details });
    throw error;
  }
  save(JSON.stringify(state));
  players.forEach(p => send(p.seat, getPlayerView(state, p.seat)));
  spectators.forEach(s => send(s, getPlayerView(state)));
}
```

Persisted games carry `state.version`; compare it with the exported `STATE_VERSION` before loading.

## Game Flow

| Stage | Waiting for | Who |
| --- | --- | --- |
| `teamBuilding` | `proposeTeam` | the leader |
| `teamVote` | `voteTeam` | every player, once |
| `quest` | `playQuestCard` | every team member, once |
| `excalibur` | `useExcalibur` | the Excalibur holder |
| `ladyOfTheLake` | `useLadyOfTheLake` | the Lady of the Lake holder |
| `assassination` | `assassinate` | the assassin |
| `ended` | — | see `state.result` |

```
teamBuilding ─► teamVote ─┬─ approved ─► quest ─► (excalibur) ─► quest resolved
      ▲                   │                                           │
      └── next leader ◄───┴─ rejected  (proposal limit reached ─► ended, evil wins)
                                                                      │
      3 quests failed ──────────────────────────────────────────────► ended, evil wins
      3 quests succeeded ─► assassination ─► ended (Merlin hit: evil wins · missed: good wins)
      otherwise ─► (ladyOfTheLake after quests 2–4) ─► next quest, next leader ─► teamBuilding
```

`getPendingActions(state)` lists what the game is waiting for and which seats may do it.

## Actions

Every action has a `type` and the acting `player` (seat).

| Action | Fields | Notes |
| --- | --- | --- |
| `proposeTeam` | `members`, `excaliburHolder?` | Distinct seats, exactly the quest's team size. With Excalibur, the leader must give it to another team member. |
| `voteTeam` | `approve` | The team is approved by a strict majority, once every player has voted. |
| `playQuestCard` | `success` | Good players must play `true`. |
| `useExcalibur` | `target` (seat or `null`) | The holder may switch another team member's card, or decline with `null`. |
| `useLadyOfTheLake` | `target` | Not the holder or a former holder. The target becomes the next holder. |
| `assassinate` | `target` | Hitting Merlin wins for evil, missing wins for good. |

## Queries

| Function | Returns |
| --- | --- |
| `getPendingActions(state)` | The actions the game waits for and who may perform them. |
| `getPlayerView(state, seat?)` | What one seat (or a spectator) may know. |
| `getCurrentQuest(state)` / `getCurrentQuestIndex(state)` | The quest being played (or `undefined` / `-1`). |
| `getCurrentTeam(state)` | The team being voted on or on the quest. |
| `getScore(state)` | `{ succeeded, failed }`. |
| `getAlignment(state, seat)` | The seat's current alignment (Lancelots may switch). |
| `areLancelotsSwitched(state)` | Whether the Lancelots are currently swapped. |
| `getSeatsOf(state, character)` / `getAssassinSeat(state)` | Seat lookups. |

## Rules

`createRule(numberOfPlayers, options?)` returns a fresh rule object:

| Option | Default | Meaning |
| --- | --- | --- |
| `lancelot` | — | `"rule1"`, `"rule2"` or `"rule3"` (see below); uses the Lancelot presets (7–12 players). |
| `ladyOfTheLake` | `false` | Lady of the Lake, used after quests 2, 3 and 4. It starts with the player on the first leader's right. |
| `excalibur` | `false` | Excalibur. |
| `allowEarlyAssassination` | `false` | The assassin may assassinate at any time, not only after good wins three quests. |

`getSupportedPlayerCounts({ lancelot? })` lists the presets. To customise a rule, spread it and pass it to `createGame`, which validates it (`validateRule` does the same on its own):

```typescript
const rule = { ...createRule(8), teamProposalLimit: { scope: "game", max: 15 } } satisfies Rule;
```

| Rule field | Meaning |
| --- | --- |
| `characters` | The characters in play (public); `createGame` deals them. |
| `assassin` | The evil character who assassinates (Morgana in the 10-player Lancelot preset). |
| `quests` | 5 × `{ teamSize, failsRequired }`. |
| `teamProposalLimit` | `{ scope: "quest", max: 5 }` is the classic rule: the 5th rejected team in a quest makes evil win. `scope: "game"` counts proposals across the whole game. |
| `visibility` | What characters learn about each other at the start (see below). |

### Lancelot Variants

| Variant | Behaviour |
| --- | --- |
| `rule1` | 5 shuffled cards (2 switch / 3 no-switch). From the third quest on, a card is revealed **every time a team-building phase starts**, re-proposals after a rejected vote included. Once all 5 are revealed there are no more switches. |
| `rule2` | 7 shuffled cards (2 switch / 5 no-switch), the top 5 used. A card is revealed as each quest starts, from the first. |
| `rule3` | The Lancelots never switch, but see each other at the start. |

### Visibility Rules

| `id` | Viewers | They see |
| --- | --- | --- |
| `merlinSeesEvil` | Merlin | Morgana, Assassin, Oberon, Minions, evil Lancelot (not Mordred) |
| `percivalSeesMerlinAndMorgana` | Percival | Merlin and Morgana, without knowing which is which |
| `evilSeesEvil` | Morgana, Assassin, Mordred, Minions | each other and the evil Lancelot (identified as such); not Oberon |
| `lancelotsSeeEachOther` | both Lancelots (`rule3` only) | each other |

Use the `id` to localise the hint you show.

## Player Views

`getPlayerView(state, seat)` contains the viewer's own character and current alignment, `knownPlayers` from the visibility rules, and the public game: rule, stage, leader, quests, Lancelot cards revealed so far, Lady of the Lake uses, results and `pendingActions`. In particular:

- Team votes are shown once everyone has voted; until then only `voted` (who has voted) is shown.
- Quest cards are never tied to players: while a quest is being played only `playedBy` is shown; the result lists the cards without seats.
- The card switched by Excalibur (`originalCard`) and the alignment seen by the Lady of the Lake are only shown to the player who used them. Lady of the Lake results become public when the game ends.
- Every character is revealed in `players` once the game has ended.
- With early assassination enabled, only the assassin is told they may assassinate.

Omit `seat` for a spectator view.

## Randomness

`createGame(rule, options?)` accepts:

| Option | Meaning |
| --- | --- |
| `characters` | Seat-by-seat deal; must be a permutation of `rule.characters`. |
| `firstLeader` | The first leader's seat. |
| `random` | A `() => number` in `[0, 1)` used for dealing, the first leader and the Lancelot deck. Defaults to Web Crypto (falls back to `Math.random`). Pass a seeded generator for reproducible games. |

## Error Handling

Every invalid call throws an `AvalonError` with a stable `code` and optional `details`. Match on `code`, not on `message`. Use `isAvalonError(error)` rather than `instanceof` if the package might be loaded twice (CommonJS and ESM).

| Code | Thrown when |
| --- | --- |
| `INVALID_RULE` | A rule is inconsistent; `details.reason` says why. |
| `UNSUPPORTED_PLAYER_COUNT` | `createRule` has no preset for the player count / Lancelot combination. |
| `INVALID_CHARACTERS` | `createGame`'s `characters` is not a permutation of `rule.characters`. |
| `INVALID_FIRST_LEADER` | `createGame`'s `firstLeader` is not a seat. |
| `INVALID_STATE` | The state is missing or from another `STATE_VERSION`. |
| `UNKNOWN_ACTION` | The action `type` is unknown. |
| `INVALID_STAGE` | The action is not allowed in the current stage (`details.expected`, `details.actual`). |
| `INVALID_PLAYER` | The acting seat (or the seat passed to a query) does not exist. |
| `PLAYER_CANNOT_ACT` | That seat may not perform this action now (`details.allowed`). |
| `ALREADY_ACTED` | The player has already voted or played a card. |
| `INVALID_VOTE` | A vote or quest card is not a boolean. |
| `INVALID_TEAM_SIZE` | The team does not have the quest's team size. |
| `INVALID_TEAM_MEMBER` | A team member is not a seat. |
| `DUPLICATE_TEAM_MEMBER` | A seat appears twice in the team. |
| `GOOD_MUST_SUCCEED` | A good player tried to play a fail card. |
| `EXCALIBUR_DISABLED` | An Excalibur holder was given in a game without Excalibur. |
| `EXCALIBUR_HOLDER_REQUIRED` | Excalibur is in play but the proposal names no holder. |
| `INVALID_EXCALIBUR_HOLDER` | The holder is not a team member, or is the leader. |
| `INVALID_EXCALIBUR_TARGET` | The target is not another team member. |
| `INVALID_LADY_OF_THE_LAKE_TARGET` | The target is not a seat, or is the holder or a former holder. |
| `INVALID_ASSASSINATION_TARGET` | The target is not a seat, or is the assassin. |

## Migrating from 1.x

2.0 is a redesign. The engine is now a pure reducer with per-player moves, so the integration changes more than the names.

| 1.x | 2.0 |
| --- | --- |
| `DefaultRuleForNumberOfPlayer(n, lancelot)`, then `rule.hasLadyOfTheLake = true` / `rule.enableExcalibur = true` | `createRule(n, { lancelot, ladyOfTheLake, excalibur })` |
| `SupportNumberOfPlayer(hasLancelot)` | `getSupportedPlayerCounts({ lancelot })` |
| `CreateAvalon(rule, customCharacters, firstLeader)` | `createGame(rule, { characters, firstLeader, random })` |
| Functions mutate `game` and need `rule` on every call | `state = applyAction(state, action)`; the rule lives in `state.rule` |
| `UpdateRecentTeamMember` + `SetExcalibur` | `proposeTeam` with `members` and `excaliburHolder` |
| `UpdateRecentTeamVote(game, rule, votes)` | one `voteTeam` per player |
| `UpdateRecentQuestVote(game, rule, votes, excaliburTarget)` | one `playQuestCard` per team member, then `useExcalibur` |
| `SetNextLadyOfTheLake(game, rule, seat)` | `useLadyOfTheLake` by the holder; the result is recorded in `state.ladyOfTheLake.uses` |
| `ChangeToAssassinate` + `Assassinate` | `assassinate`; early assassination needs `allowEarlyAssassination` |
| `RecentTeam(game)` | `getCurrentTeam(state)` |
| `game.players[i].key` / `.alignment` | `state.characters[i]` / `getAlignment(state, i)` |
| `game.result: "goodWin" \| "evilWin"` | `state.result: { winner: "good" \| "evil", reason }` |
| Stages `team` / `quest` / `ladyOfTheLake` / `assassinate` / `end` | `teamBuilding` + `teamVote` / `quest` + `excalibur` / `ladyOfTheLake` / `assassination` / `ended` |
| `lancelot_good` / `lancelot_evil` | `lancelotGood` / `lancelotEvil` |
| `numberOfPlayer`, `numberOfMembers`, `needTwoFailure` | `numberOfPlayers`, `teamSize`, `failsRequired` |
| `quest.team: { mode: "each" \| "whole", maxCountOfSummonTeam }` | `teamProposalLimit: { scope: "quest" \| "game", max }` |
| `characterVisibilitiesRules[].title` (Chinese) | `visibility[].id` |
| `Characters` (array), `TAvalon`, `TRule`, … | `CHARACTERS` (record), `GameState`, `Rule`, … |

Behaviour that changed:

- Good players can no longer play fail cards.
- With Excalibur, the leader must give it to a team member, and the engine applies the switch.
- Custom characters must be a permutation of the rule's characters.
- Quest results keep the cards without seats; send players `getPlayerView` rather than the state.
- Lady of the Lake records the alignment the holder saw, which stays correct if a Lancelot switches later.

## Scripts

```bash
pnpm install
pnpm test       # Jest
pnpm typecheck  # tsc --noEmit
pnpm build      # tsup (cjs + esm + d.ts)
```

## Project Layout

```
src/
  index.ts      # public exports
  rule.ts       # presets, createRule, validateRule, visibility rules
  character.ts  # character catalogue
  game.ts       # createGame
  actions.ts    # applyAction: every move and its validation
  selectors.ts  # read-only queries
  view.ts       # per-player views
  internal.ts   # shared state transitions
  types.ts      # state and action types
  random.ts     # random sources and shuffling
  error.ts      # AvalonError
tests/          # Jest specs
```

## License

[MIT](./LICENSE) © Heng Yin
