# Avalon Core

[English](./README.md) · [简体中文](./README.zh-CN.md)

一个与框架无关的 TypeScript《抵抗组织：阿瓦隆》游戏引擎。它负责发身份、组队、投票、任务、湖中仙女、王者之剑、兰斯洛特变体和刺杀，判定胜负，并且只告诉每位玩家他有权知道的信息。UI 与网络层完全由你决定。

- **包名**：`@avalon-app/core`
- **许可证**：MIT
- **Node**：>= 22（发布产物为 ES2019，同样可运行在浏览器与小游戏环境中）

## 安装

```bash
npm install @avalon-app/core
# 或
pnpm add @avalon-app/core
```

## 功能特性

- **5–12 人规则预设**（11、12 人仅支持兰斯洛特规则），并可校验手写规则。
- **纯函数、不可变的 reducer**：`applyAction(state, action)` 返回新状态；非法操作抛出 `AvalonError`，不改动任何状态。
- **自包含、可 JSON 序列化的状态**：对局自带一份规则副本，可直接存储、网络传输与恢复。
- **规则由引擎强制执行**：每个操作都带上执行者座位，引擎校验该座位此刻是否有权行动（队长、投票者、队员、王者之剑/湖中仙女持有者、刺客）；好人不能出失败牌。
- **按玩家投影的视图**：`getPlayerView(state, seat)` 隐藏他人身份、进行中的投票、任务牌归属，以及湖中仙女和王者之剑的私密结果。
- **可选模块**：湖中仙女、王者之剑、三种兰斯洛特变体、提前刺杀。
- **可注入随机源**：默认不可预测（Web Crypto），测试与回放可使用带种子的随机源。

## 快速开始

```typescript
import { applyAction, createGame, createRule, getPendingActions, getPlayerView } from "@avalon-app/core";

const rule = createRule(7, { ladyOfTheLake: true });
let game = createGame(rule); // 身份与首任队长随机

// 队长提名队伍
game = applyAction(game, { type: "proposeTeam", player: game.leader, members: [0, 1] });

// 每位玩家投票，顺序不限
for (let player = 0; player < rule.numberOfPlayers; player++) {
  game = applyAction(game, { type: "voteTeam", player, approve: true });
}

// 队员出任务牌
game = applyAction(game, { type: "playQuestCard", player: 0, success: true });
game = applyAction(game, { type: "playQuestCard", player: 1, success: true });

getPendingActions(game); // [{ type: "proposeTeam", players: [<下一任队长>] }]
getPlayerView(game, 3);  // 3 号座位有权知道的全部信息——发给他的客户端
```

## 推荐架构

完整的 `GameState` 含有秘密信息（所有人的身份、未翻开的兰斯洛特牌、进行中的投票），请把它保存在服务器（或房主设备）上，不要发给玩家。

```typescript
import { applyAction, getPlayerView, isAvalonError, GameAction } from "@avalon-app/core";

function onPlayerMove(seat: number, move: GameAction) {
  try {
    // 始终使用鉴权后的座位，不要信任客户端传来的座位
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

持久化的对局带有 `state.version`，加载前请与导出的 `STATE_VERSION` 比对。

## 游戏流程

| 阶段 | 等待的操作 | 谁来操作 |
| --- | --- | --- |
| `teamBuilding` | `proposeTeam` | 队长 |
| `teamVote` | `voteTeam` | 每位玩家各一次 |
| `quest` | `playQuestCard` | 每位队员各一次 |
| `excalibur` | `useExcalibur` | 王者之剑持有者 |
| `ladyOfTheLake` | `useLadyOfTheLake` | 湖中仙女持有者 |
| `assassination` | `assassinate` | 刺客 |
| `ended` | — | 见 `state.result` |

```
teamBuilding ─► teamVote ─┬─ 通过 ─► quest ─► (excalibur) ─► 任务结算
      ▲                   │                                     │
      └── 下一任队长 ◄─────┴─ 否决（达到组队次数上限 ─► ended，坏人胜）
                                                                │
      失败 3 个任务 ──────────────────────────────────────────► ended，坏人胜
      成功 3 个任务 ─► assassination ─► ended（刺中梅林：坏人胜 · 刺空：好人胜）
      其他情况 ─►（第 2–4 个任务后进入 ladyOfTheLake）─► 下一个任务、下一任队长 ─► teamBuilding
```

`getPendingActions(state)` 会列出当前等待的操作以及可以执行的座位。

## 操作

每个操作都包含 `type` 与执行者座位 `player`。

| 操作 | 字段 | 说明 |
| --- | --- | --- |
| `proposeTeam` | `members`、`excaliburHolder?` | 座位不可重复，人数必须等于该任务的队伍人数。启用王者之剑时，队长必须把剑交给另一名队员。 |
| `voteTeam` | `approve` | 所有人投完后，严格过半数即通过。 |
| `playQuestCard` | `success` | 好人必须出 `true`。 |
| `useExcalibur` | `target`（座位或 `null`） | 持剑人可以翻转另一名队员的牌，传 `null` 表示放弃。 |
| `useLadyOfTheLake` | `target` | 不能是持有者本人或曾经的持有者；被查验者成为下一任持有者。 |
| `assassinate` | `target` | 刺中梅林则坏人胜，刺空则好人胜。 |

## 查询函数

| 函数 | 返回 |
| --- | --- |
| `getPendingActions(state)` | 当前等待的操作及可执行的座位。 |
| `getPlayerView(state, seat?)` | 某个座位（或观众）有权知道的信息。 |
| `getCurrentQuest(state)` / `getCurrentQuestIndex(state)` | 正在进行的任务（无则为 `undefined` / `-1`）。 |
| `getCurrentTeam(state)` | 正在投票或正在执行任务的队伍。 |
| `getScore(state)` | `{ succeeded, failed }`。 |
| `getAlignment(state, seat)` | 该座位当前的阵营（兰斯洛特可能转换）。 |
| `areLancelotsSwitched(state)` | 两位兰斯洛特当前是否处于转换状态。 |
| `getSeatsOf(state, character)` / `getAssassinSeat(state)` | 座位查询。 |

## 规则

`createRule(numberOfPlayers, options?)` 每次返回一个新的规则对象：

| 选项 | 默认值 | 含义 |
| --- | --- | --- |
| `lancelot` | — | `"rule1"`、`"rule2"` 或 `"rule3"`（见下文），使用兰斯洛特预设（7–12 人）。 |
| `ladyOfTheLake` | `false` | 湖中仙女，在第 2、3、4 个任务后使用，初始由首任队长右手边的玩家持有。 |
| `excalibur` | `false` | 王者之剑。 |
| `allowEarlyAssassination` | `false` | 刺客可在任意时刻刺杀，而不仅限于好人完成 3 个任务之后。 |

`getSupportedPlayerCounts({ lancelot? })` 列出所有预设人数。要自定义规则，展开后修改再传给 `createGame`，它会做校验（也可单独调用 `validateRule`）：

```typescript
const rule = { ...createRule(8), teamProposalLimit: { scope: "game", max: 15 } } satisfies Rule;
```

| 规则字段 | 含义 |
| --- | --- |
| `characters` | 本局使用的角色（公开信息），由 `createGame` 发给各座位。 |
| `assassin` | 执行刺杀的坏人角色（10 人兰斯洛特预设中是莫甘娜）。 |
| `quests` | 5 个 `{ teamSize, failsRequired }`。 |
| `teamProposalLimit` | `{ scope: "quest", max: 5 }` 为经典规则：同一任务中第 5 次组队被否决则坏人胜。`scope: "game"` 按整局累计组队次数。 |
| `visibility` | 开局时各角色能看到谁（见下文）。 |

### 兰斯洛特变体

| 变体 | 行为 |
| --- | --- |
| `rule1` | 5 张洗混的牌（2 张转换 / 3 张不转换）。从第 3 个任务起，**每次进入组队阶段**都翻一张牌，包括组队被否决后的重新组队；5 张翻完后不再转换。 |
| `rule2` | 7 张洗混的牌（2 张转换 / 5 张不转换），取前 5 张。从第 1 个任务起，每个任务开始时翻一张。 |
| `rule3` | 兰斯洛特从不转换阵营，但开局时可以互相看到。 |

### 可见性规则

| `id` | 查看者 | 能看到 |
| --- | --- | --- |
| `merlinSeesEvil` | 梅林 | 莫甘娜、刺客、奥伯伦、爪牙、坏兰斯洛特（看不到莫德雷德） |
| `percivalSeesMerlinAndMorgana` | 派西维尔 | 梅林与莫甘娜，但分不清谁是谁 |
| `evilSeesEvil` | 莫甘娜、刺客、莫德雷德、爪牙 | 彼此以及坏兰斯洛特（并知道他是兰斯洛特）；看不到奥伯伦 |
| `lancelotsSeeEachOther` | 两位兰斯洛特（仅 `rule3`） | 彼此 |

可以用 `id` 来做提示文案的本地化。

## 玩家视图

`getPlayerView(state, seat)` 包含查看者自己的角色与当前阵营、由可见性规则得出的 `knownPlayers`，以及公开的对局信息：规则、阶段、队长、任务、已翻开的兰斯洛特牌、湖中仙女使用记录、结果和 `pendingActions`。具体来说：

- 组队投票在所有人投完后才公开；在此之前只显示 `voted`（谁已投票）。
- 任务牌永远不与玩家对应：任务进行中只显示 `playedBy`，结果中的牌不带座位。
- 王者之剑翻转前的原始牌（`originalCard`）与湖中仙女看到的阵营只对使用者本人可见；湖中仙女的结果在游戏结束后公开。
- 游戏结束后，`players` 公开所有人的身份。
- 启用提前刺杀时，只有刺客本人会被告知可以刺杀。

不传 `seat` 即为观众视图。

## 随机性

`createGame(rule, options?)` 支持：

| 选项 | 含义 |
| --- | --- |
| `characters` | 按座位指定身份，必须是 `rule.characters` 的一个排列。 |
| `firstLeader` | 首任队长的座位。 |
| `random` | 返回 `[0, 1)` 的 `() => number`，用于发身份、选首任队长和洗兰斯洛特牌。默认使用 Web Crypto（不可用时回退到 `Math.random`）。传入带种子的随机源即可复现对局。 |

## 错误处理

所有非法调用都会抛出带有稳定 `code` 与可选 `details` 的 `AvalonError`。请基于 `code` 判断，不要依赖 `message`。如果包可能被加载两份（CommonJS 与 ESM 同时存在），请用 `isAvalonError(error)` 而不是 `instanceof`。

| Code | 触发场景 |
| --- | --- |
| `INVALID_RULE` | 规则不自洽，具体原因见 `details.reason`。 |
| `UNSUPPORTED_PLAYER_COUNT` | `createRule` 没有该人数 / 兰斯洛特组合的预设。 |
| `INVALID_CHARACTERS` | `createGame` 的 `characters` 不是 `rule.characters` 的排列。 |
| `INVALID_FIRST_LEADER` | `createGame` 的 `firstLeader` 不是合法座位。 |
| `INVALID_STATE` | 状态缺失，或其版本与 `STATE_VERSION` 不一致。 |
| `UNKNOWN_ACTION` | 未知的操作 `type`。 |
| `INVALID_STAGE` | 当前阶段不允许该操作（`details.expected`、`details.actual`）。 |
| `INVALID_PLAYER` | 执行者座位（或传给查询函数的座位）不存在。 |
| `PLAYER_CANNOT_ACT` | 该座位此刻无权执行该操作（`details.allowed`）。 |
| `ALREADY_ACTED` | 该玩家已经投过票或出过牌。 |
| `INVALID_VOTE` | 投票或任务牌不是布尔值。 |
| `INVALID_TEAM_SIZE` | 队伍人数与该任务要求不符。 |
| `INVALID_TEAM_MEMBER` | 某个队员不是合法座位。 |
| `DUPLICATE_TEAM_MEMBER` | 同一座位在队伍中出现两次。 |
| `GOOD_MUST_SUCCEED` | 好人试图出失败牌。 |
| `EXCALIBUR_DISABLED` | 未启用王者之剑的对局中指定了持剑人。 |
| `EXCALIBUR_HOLDER_REQUIRED` | 启用了王者之剑，但提名时没有指定持剑人。 |
| `INVALID_EXCALIBUR_HOLDER` | 持剑人不是队员，或是队长本人。 |
| `INVALID_EXCALIBUR_TARGET` | 目标不是另一名队员。 |
| `INVALID_LADY_OF_THE_LAKE_TARGET` | 目标不是合法座位，或是持有者本人 / 曾经的持有者。 |
| `INVALID_ASSASSINATION_TARGET` | 目标不是合法座位，或是刺客本人。 |

## 从 1.x 迁移

2.0 是一次重新设计：引擎变成了按玩家逐个操作的纯 reducer，因此接入方式的变化不止是改名。

| 1.x | 2.0 |
| --- | --- |
| `DefaultRuleForNumberOfPlayer(n, lancelot)`，再设置 `rule.hasLadyOfTheLake = true` / `rule.enableExcalibur = true` | `createRule(n, { lancelot, ladyOfTheLake, excalibur })` |
| `SupportNumberOfPlayer(hasLancelot)` | `getSupportedPlayerCounts({ lancelot })` |
| `CreateAvalon(rule, customCharacters, firstLeader)` | `createGame(rule, { characters, firstLeader, random })` |
| 函数原地修改 `game`，每次调用都要传 `rule` | `state = applyAction(state, action)`；规则保存在 `state.rule` 中 |
| `UpdateRecentTeamMember` + `SetExcalibur` | `proposeTeam`，带 `members` 与 `excaliburHolder` |
| `UpdateRecentTeamVote(game, rule, votes)` | 每位玩家一次 `voteTeam` |
| `UpdateRecentQuestVote(game, rule, votes, excaliburTarget)` | 每位队员一次 `playQuestCard`，再由持剑人 `useExcalibur` |
| `SetNextLadyOfTheLake(game, rule, seat)` | 由持有者执行 `useLadyOfTheLake`，结果记录在 `state.ladyOfTheLake.uses` |
| `ChangeToAssassinate` + `Assassinate` | `assassinate`；提前刺杀需要开启 `allowEarlyAssassination` |
| `RecentTeam(game)` | `getCurrentTeam(state)` |
| `game.players[i].key` / `.alignment` | `state.characters[i]` / `getAlignment(state, i)` |
| `game.result: "goodWin" \| "evilWin"` | `state.result: { winner: "good" \| "evil", reason }` |
| 阶段 `team` / `quest` / `ladyOfTheLake` / `assassinate` / `end` | `teamBuilding` + `teamVote` / `quest` + `excalibur` / `ladyOfTheLake` / `assassination` / `ended` |
| `lancelot_good` / `lancelot_evil` | `lancelotGood` / `lancelotEvil` |
| `numberOfPlayer`、`numberOfMembers`、`needTwoFailure` | `numberOfPlayers`、`teamSize`、`failsRequired` |
| `quest.team: { mode: "each" \| "whole", maxCountOfSummonTeam }` | `teamProposalLimit: { scope: "quest" \| "game", max }` |
| `characterVisibilitiesRules[].title`（中文） | `visibility[].id` |
| `Characters`（数组）、`TAvalon`、`TRule` 等 | `CHARACTERS`（对象）、`GameState`、`Rule` 等 |

行为变化：

- 好人不能再出失败牌。
- 启用王者之剑时，队长必须把剑交给一名队员，翻牌由引擎执行。
- 自定义身份必须是规则角色的一个排列。
- 任务结果中的牌不带座位；请把 `getPlayerView` 而不是完整状态发给玩家。
- 湖中仙女会记录持有者当时看到的阵营，即使之后兰斯洛特转换阵营，这一记录依然正确。

## 常用脚本

```bash
pnpm install
pnpm test       # 运行 Jest 测试
pnpm typecheck  # tsc --noEmit
pnpm build      # 使用 tsup 打包（cjs + esm + d.ts）
```

## 目录结构

```
src/
  index.ts      # 公共导出
  rule.ts       # 预设、createRule、validateRule、可见性规则
  character.ts  # 角色目录
  game.ts       # createGame
  actions.ts    # applyAction：所有操作及其校验
  selectors.ts  # 只读查询
  view.ts       # 按玩家投影的视图
  internal.ts   # 共享的状态转换
  types.ts      # 状态与操作类型
  random.ts     # 随机源与洗牌
  error.ts      # AvalonError
tests/          # Jest 测试
```

## 许可证

[MIT](./LICENSE) © Heng Yin
