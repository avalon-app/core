# Changelog

## [2.1.0](https://github.com/avalon-app/core/compare/v2.0.0...v2.1.0) (2026-10-16)


### Features

* let the Excalibur holder decide while quest cards are being played ([8fee19c](https://github.com/avalon-app/core/commit/8fee19c0a9d02b982eeccf9b3488b3429ea961a5))

## [2.0.0](https://github.com/avalon-app/core/compare/v1.1.0...v2.0.0) (2026-10-16)


### Features

* harden state transitions and apply Excalibur in the engine ([4a37985](https://github.com/avalon-app/core/commit/4a379855dec10d80a5f5ee8e4deab1dcf37c550f))
* redesign the engine as a pure, per-player game reducer ([4497232](https://github.com/avalon-app/core/commit/44972325126c765afd362b17467a06101df2e37b))


### BREAKING CHANGES

* The whole public API is replaced. CreateAvalon,
DefaultRuleForNumberOfPlayer, the Update*/Set* mutators, RecentTeam and the
T-prefixed types are removed in favour of createGame, createRule,
applyAction, the query functions and getPlayerView. Character keys, stage
names, rule fields and error codes changed, and Node >= 22 is required.
See "Migrating from 1.x" in the README.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

## [1.1.0](https://github.com/avalon-app/core/compare/v1.0.0...v1.1.0) (2026-05-13)


### Features

* define first leader parameter in Create function for Avalon game ([f8af960](https://github.com/avalon-app/core/commit/f8af9601bb4401a9e82683adc47176df89c6710d))
* **errors:** implement AvalonError class and update error handling in game logic ([172203a](https://github.com/avalon-app/core/commit/172203ac57de1d6a1c1fab8a623b80683a8a774b))

## 1.0.0 (2026-05-13)


### Bug Fixes

* correct typos in property names and improve validation checks ([a969077](https://github.com/avalon-app/core/commit/a969077f0d102e374f8c7222952ce58cb291673b))


### Features

* add game rules and character visibility logic ([50a3a83](https://github.com/avalon-app/core/commit/50a3a834e5bf5d4ea6857b308b3ce284b2c87109))
