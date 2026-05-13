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
