# Avalon Core

[English](./README.md) · [简体中文](./README.zh-CN.md)

一个与框架无关的《抵抗组织：阿瓦隆》TypeScript 游戏引擎。负责发牌、任务流程、组队投票、湖中仙女、王者之剑、兰斯洛特规则、刺杀阶段等核心逻辑，UI 完全由你自行实现。

- **包名**：`@avalon-app/core`
- **协议**：MIT
- **Node**：>= 18

## 安装

```bash
npm install @avalon-app/core
# 或
pnpm add @avalon-app/core
# 或
yarn add @avalon-app/core
```

## 功能特性

- **5–12 人**预设规则，开箱即用。
- **任务流程**：组队 → 组队投票 → 任务投票 → 进入下一任务。
- **特殊角色**：梅林、派西维尔、莫甘娜、莫德雷德、奥伯伦、刺客、忠臣、爪牙，以及好/坏兰斯洛特。
- **可选模块**：湖中仙女、王者之剑、三种兰斯洛特规则（`rule1` / `rule2` / `rule3`）。
- **可见性规则**：描述游戏开局时各角色之间能看到谁。
- **刺杀阶段**：当好人方完成 3 个任务后自动进入。
- **纯状态机**：不做任何 I/O，也不假设 UI；通过调用导出函数推动状态机演进。

## 快速开始

```typescript
import {
  CreateAvalon,
  DefaultRuleForNumberOfPlayer,
  UpdateRecentTeamMember,
  UpdateRecentTeamVote,
  UpdateResentQuestVote,
} from "@avalon-app/core";

// 1. 构造一份规则（可选传入 Lancelot 规则："rule1" | "rule2" | "rule3"）
const rule = DefaultRuleForNumberOfPlayer(7);

// 2. 创建游戏：角色随机洗牌，首位队长随机选出。
const game = CreateAvalon(rule);

// 3. 当前队长为第 1 个任务提名队伍。
UpdateRecentTeamMember(game, [0, 1]);

// 4. 全体玩家对队伍进行投票（true 表示同意）。
UpdateRecentTeamVote(
  game,
  rule,
  game.players.map((_, i) => ({ player: i, vote: true }))
);

// 5. 若组队通过，队员开始任务投票。
UpdateResentQuestVote(game, rule, [true, true]);

// game.stage 会自动推进："team" → "quest" → "team"/"ladyOfTheLake"/"assassinate"/"end"
console.log(game.stage, game.result);
```

## API 概览

| 导出 | 作用 |
| --- | --- |
| `CreateAvalon(rule, customCharacters?)` | 初始化一个新游戏状态。 |
| `DefaultRuleForNumberOfPlayer(n, lancelot?)` | `n` 人局的内置规则预设。 |
| `SupportNumberOfPlayer(hasLancelot?)` | 列出支持的人数。 |
| `UpdateRecentTeamMember(game, members)` | 队长提名当前队伍。 |
| `UpdateRecentTeamVote(game, rule, votes)` | 应用组队投票，推进阶段或轮换队长。 |
| `UpdateResentQuestVote(game, rule, votes, excaliburTarget?)` | 应用任务投票。 |
| `SetNextLadyOfTheLake(game, rule, player)` | 选定下一位湖中仙女。 |
| `SetExcalibur(game, player)` | 将王者之剑交给某队员。 |
| `ChangeToAssassinate(game)` | 强制进入刺杀阶段。 |
| `Assassinate(game, target)` | 执行刺杀并结束游戏。 |
| `RecentTeam(game)` | 查看当前正在提名/投票的队伍。 |
| `Characters` | 角色元数据（key + 阵营）。 |

类型导出：`TAvalon`、`TQuest`、`TTeam`、`TRule`、`TCharacterKey`、`TAlignment`。

## 错误处理

所有非法调用都会抛出 `AvalonError`——它继承自 `Error`，附带稳定的程序化字段 `code` 以及可选的 `details`。请基于 `code` 进行匹配，不要依赖 `message`（文案可能调整）。

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

`code` 字段的类型为 `TAvalonErrorCode`：

| Code | 触发场景 |
| --- | --- |
| `INVALID_LANCELOT_RULE` | `DefaultRuleForNumberOfPlayer` 收到未知的 lancelot 规则字符串。 |
| `NO_RULE_FOR_PLAYER_COUNT` | 找不到匹配 `numberOfPlayer` / lancelot 组合的预设。 |
| `INVALID_LANCELOT_CONFIG` | `CreateAvalon` 传入了非法的 lancelot 规则，或在 7 人以下启用了 lancelot。 |
| `INVALID_FIRST_LEADER` | `CreateAvalon` 的 `firstLeader` 不是 `[0, numberOfPlayer)` 范围内的整数。 |
| `INVALID_LEADER` | `CreateQuests`（内部）的 leader 不在 `[0, numberOfPlayer)` 范围。 |
| `INVALID_STAGE` | 在错误的阶段调用了某个动作。`details: { expected, actual }`。 |
| `NO_QUEST_IN_PROGRESS` | 需要进行中的任务但找不到。 |
| `NO_TEAM_IN_PROGRESS` | 当前任务没有可操作的队伍。 |
| `NO_RECENT_TEAM` | `SetExcalibur` 找不到最近的队伍。 |
| `NO_LAST_FINISHED_QUEST` | `SetNextLadyOfTheLake` 调用时还没有已完成的任务。 |
| `CANNOT_CREATE_NEW_TEAM` | 已达到最大组队次数上限。 |
| `INVALID_TEAM_MEMBER_COUNT` | 队伍人数与任务的 `numberOfMembers` 不匹配。 |
| `INVALID_TEAM_MEMBER` | 提名的某个队员不是合法的玩家索引。 |
| `INVALID_VOTE_COUNT` | 投票数量与当前阶段的期望不一致。 |
| `INVALID_VOTER` | 投票引用了不存在的玩家座位。 |
| `DUPLICATE_VOTER` | 同一玩家在一次投票中出现多次。 |
| `INVALID_LADY_OF_THE_LAKE` | `SetNextLadyOfTheLake` 目标不在 `[0, numberOfPlayer)` 范围。 |
| `LADY_OF_THE_LAKE_ALREADY_HELD` | 选择的玩家曾经担任过湖中仙女。 |
| `EXCALIBUR_DISABLED` | `rule.enableExcalibur` 为 false 时调用 `SetExcalibur`。 |
| `EXCALIBUR_NOT_TEAM_MEMBER` | 王者之剑目标不在当前队伍中。 |
| `EXCALIBUR_IS_LEADER` | 王者之剑目标是队长（不允许）。 |
| `INVALID_ASSASSINATION_TARGET` | `Assassinate` 目标不是合法的玩家座位。 |
| `MISSING_LANCELOT_SWITCH` | 内部：启用了 lancelot 规则但 switch 数组缺失。 |

## 阶段流转

```
team ─► quest ─► team             （任务结束，还有未完成的任务）
              ─► ladyOfTheLake ─► team
              ─► assassinate ─► end
              ─► end                （连失 3 局）
team ─► end                          （连续 5 次组队失败）
```

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
  avalon.ts     # 顶层游戏状态机
  quest.ts     # 任务 / 队伍原语
  rule.ts      # 人数预设与可见性规则
  character.ts # 角色目录
  tools.ts     # 随机化工具
  index.ts     # 对外导出
tests/         # Jest 测试（规则、任务、完整对局）
```

## 许可证

[MIT](./LICENSE) © Heng Yin
