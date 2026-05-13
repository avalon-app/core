# Avalon Core

[English](./README.md) · [简体中文](./README.zh-CN.md)

A framework-agnostic TypeScript game engine for *The Resistance: Avalon*. It handles character dealing, quest flow, team voting, Lady of the Lake, Excalibur, Lancelot rules, and assassination — leaving the UI entirely up to you.

- **Package**: `@avalon-app/core`
- **License**: MIT
- **Node**: >= 18

## Installation

```bash
npm install @avalon-app/core
# or
pnpm add @avalon-app/core
# or
yarn add @avalon-app/core
```

## Features

- **Player counts 5–12**, with built-in rule presets.
- **Quest flow**: team proposal → team vote → quest vote → next quest.
- **Special roles**: Merlin, Percival, Morgana, Mordred, Oberon, Assassin, Loyal Servant, Minion, plus Good/Evil Lancelot.
- **Optional modules**: Lady of the Lake, Excalibur, three Lancelot rule variants (`rule1`/`rule2`/`rule3`).
- **Visibility rules** describing which characters can see each other at the start of the game.
- **Assassination phase** when the good side wins three quests.
- **Pure state machine** — no I/O, no UI assumptions; you drive transitions by calling exported functions.

## Quick Start

```typescript
import {
  CreateAvalon,
  DefaultRuleForNumberOfPlayer,
  UpdateRecentTeamMember,
  UpdateRecentTeamVote,
  UpdateResentQuestVote,
} from "@avalon-app/core";

// 1. Build a rule preset (optionally with Lancelot: "rule1" | "rule2" | "rule3")
const rule = DefaultRuleForNumberOfPlayer(7);

// 2. Create a game. Characters are shuffled, leader is chosen randomly.
const game = CreateAvalon(rule);

// 3. The current leader proposes a team for quest #1.
UpdateRecentTeamMember(game, [0, 1]);

// 4. All players vote on the team (true = approve).
UpdateRecentTeamVote(
  game,
  rule,
  game.players.map((_, i) => ({ player: i, vote: true }))
);

// 5. If the team is approved, members vote on the quest.
UpdateResentQuestVote(game, rule, [true, true]);

// game.stage advances automatically: "team" → "quest" → "team"/"ladyOfTheLake"/"assassinate"/"end"
console.log(game.stage, game.result);
```

## API Overview

| Export | Purpose |
| --- | --- |
| `CreateAvalon(rule, customCharacters?)` | Initialise a new game state. |
| `DefaultRuleForNumberOfPlayer(n, lancelot?)` | Built-in rule preset for `n` players. |
| `SupportNumberOfPlayer(hasLancelot?)` | List supported player counts. |
| `UpdateRecentTeamMember(game, members)` | Leader proposes the current team. |
| `UpdateRecentTeamVote(game, rule, votes)` | Apply the team vote; advances stage or rotates leader. |
| `UpdateResentQuestVote(game, rule, votes, excaliburTarget?)` | Apply the quest vote. |
| `SetNextLadyOfTheLake(game, rule, player)` | Choose the next Lady of the Lake. |
| `SetExcalibur(game, player)` | Hand Excalibur to a team member. |
| `ChangeToAssassinate(game)` | Force-enter the assassination stage. |
| `Assassinate(game, target)` | Resolve the assassination and end the game. |
| `RecentTeam(game)` | Inspect the current team being proposed/voted on. |
| `Characters` | Character metadata (key + alignment). |

Types are exported as `TAvalon`, `TQuest`, `TTeam`, `TRule`, `TCharacterKey`, `TAlignment`.

## Error Handling

Every invalid call throws an `AvalonError` — a subclass of `Error` with a stable, programmatic `code` and an optional `details` payload. Match on `code`, not on `message` (messages may be reworded).

```typescript
import { AvalonError, Assassinate } from "@avalon-app/core";

try {
  Assassinate(game, -1);
} catch (e) {
  if (e instanceof AvalonError) {
    console.log(e.code);    // "INVALID_ASSASSINATION_TARGET"
    console.log(e.details); // { target: -1, numberOfPlayer: 5 }
  }
}
```

The `code` field is typed as `TAvalonErrorCode`:

| Code | Thrown when |
| --- | --- |
| `INVALID_LANCELOT_RULE` | `DefaultRuleForNumberOfPlayer` receives an unknown lancelot rule string. |
| `NO_RULE_FOR_PLAYER_COUNT` | No preset matches the requested `numberOfPlayer` / lancelot combination. |
| `INVALID_LANCELOT_CONFIG` | `CreateAvalon` called with an invalid lancelot rule, or lancelot enabled with fewer than 7 players. |
| `INVALID_FIRST_LEADER` | `CreateAvalon`'s `firstLeader` is not an integer in `[0, numberOfPlayer)`. |
| `INVALID_LEADER` | `CreateQuests` (internal) given a leader seat outside `[0, numberOfPlayer)`. |
| `INVALID_STAGE` | An action was called in the wrong stage. `details: { expected, actual }`. |
| `NO_QUEST_IN_PROGRESS` | No quest is currently in progress when one is required. |
| `NO_TEAM_IN_PROGRESS` | The active quest has no team to operate on. |
| `NO_RECENT_TEAM` | `SetExcalibur` could not find a recent team. |
| `NO_LAST_FINISHED_QUEST` | `SetNextLadyOfTheLake` called with no finished quest yet. |
| `CANNOT_CREATE_NEW_TEAM` | The team-proposal cap has been reached. |
| `INVALID_TEAM_MEMBER_COUNT` | Team size doesn't match the quest's `numberOfMembers`. |
| `INVALID_TEAM_MEMBER` | A proposed member seat is not a valid player index. |
| `INVALID_VOTE_COUNT` | Number of votes doesn't match what the stage expects. |
| `INVALID_VOTER` | A vote references a non-existent player seat. |
| `DUPLICATE_VOTER` | The same player appears more than once in a vote payload. |
| `INVALID_LADY_OF_THE_LAKE` | `SetNextLadyOfTheLake` target is not in `[0, numberOfPlayer)`. |
| `LADY_OF_THE_LAKE_ALREADY_HELD` | The chosen player has already held Lady of the Lake. |
| `EXCALIBUR_DISABLED` | `SetExcalibur` called when `rule.enableExcalibur` is false. |
| `EXCALIBUR_NOT_TEAM_MEMBER` | Excalibur target is not a member of the current team. |
| `EXCALIBUR_IS_LEADER` | Excalibur target is the team leader (not allowed). |
| `INVALID_ASSASSINATION_TARGET` | `Assassinate` target is not a valid player seat. |
| `MISSING_LANCELOT_SWITCH` | Internal: lancelot switch array is missing for an active lancelot rule. |

## Game Stages

```
team ─► quest ─► team       (quest finished, more quests to play)
              ─► ladyOfTheLake ─► team
              ─► assassinate ─► end
              ─► end           (3 fails)
team ─► end                    (5 rejected team votes)
```

## Scripts

```bash
pnpm install
pnpm test       # run the Jest suite
pnpm typecheck  # tsc --noEmit
pnpm build      # bundle with tsup (cjs + esm + d.ts)
```

## Project Layout

```
src/
  avalon.ts     # top-level game state machine
  quest.ts     # quest / team primitives
  rule.ts      # player-count presets and visibility rules
  character.ts # character catalogue
  tools.ts     # randomisation helpers
  index.ts     # public exports
tests/         # Jest specs (rules, quests, full game flows)
```

## License

[MIT](./LICENSE) © Heng Yin
