# Avalon Core

## Project Summary

The Avalon Core project is a TypeScript implementation of the Avalon game logic. Avalon is a social deduction game where players are either loyal servants of Arthur or minions of Mordred. The game involves quests, team selections, and special roles with unique abilities.

### Key Features

- **Game Setup**: Create and initialize a new Avalon game instance.
- **Team Management**: Update and manage team members and their votes.
- **Quest Management**: Handle quest votes and outcomes.
- **Special Roles**: Implement special roles like "Lady of the Lake" and "Assassin".
- **Rule Support**: Define and support rules for different numbers of players.
- **Character Management**: Manage characters, their alignments, and roles.

### Main Components

- **Avalon**: Core game logic and state management.
- **Quest**: Logic related to quests and team votes.
- **Rule**: Rules and configurations for different game setups.
- **Character**: Definitions and management of game characters and their roles.

### Usage

The project provides a set of functions and types to manage the game state, handle player actions, and enforce game rules. These are consolidated and exported through the `src/index.ts` file for easy access.

### Getting Started

To get started with the Avalon Core project, clone the repository and install the necessary dependencies. You can then use the provided functions to create and manage Avalon game instances.

```bash
git clone https://github.com/yourusername/avalon_core.git
cd avalon_core
npm install
```

## Example

Here's a basic example of how to create a new Avalon game instance, make a team, and vote on the team:

```typescript
import { CreateAvalon, UpdateRecentTeamMember, UpdateRecentTeamVote, DefaultRuleForNumberOfPlayer } from './src';

// Create a new Avalon game instance with 5 players
const rule = DefaultRuleForNumberOfPlayer(5)
const avalon = CreateAvalon(rule);

// Add players to the recent team
UpdateRecentTeamMember(avalon, [0, 1, 2]);

// Players vote on the team
// votes: { vote: boolean, player: number }[]
UpdateRecentTeamVote(avalon, rule, [
    {vote: true, player: 0},
    {vote: true, player: 1},
    {vote: true, player: 2},
    {vote: true, player: 3},
    {vote: true, player: 4}
]);

// Check the result of the team vote
console.log(avalon.quests[0].result);
```

This project aims to provide a robust and flexible implementation of the Avalon game logic, making it easy to integrate into various applications and platforms.

