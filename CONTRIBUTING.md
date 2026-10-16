# Contributing

Thanks for considering a contribution to `@avalon-app/core`!

## Prerequisites

- Node.js >= 22
- pnpm (the version is pinned via `packageManager` in `package.json` — Corepack will pick it up automatically)

```bash
corepack enable
pnpm install
```

## Day-to-day commands

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run the Jest suite. |
| `pnpm typecheck` | `tsc --noEmit` over `src` and `tests`. |
| `pnpm build` | Bundle with `tsup` (cjs + esm + d.ts). |

## Branching & PRs

- Branch off `main`.
- Keep PRs focused. A bug fix doesn't need surrounding refactors.
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) format — they decide the next release (see below).
- The PR template will remind you about tests, typecheck, docs and commit messages.

## Commit messages

Releases are computed from the commit messages that land on `main`, so every commit must follow Conventional Commits:

```
<type>(<optional scope>): <summary>

<optional body>

<optional footers>
```

| Commit | Release |
| --- | --- |
| `fix: …`, `perf: …` | patch |
| `feat: …` | minor |
| Any type with a `BREAKING CHANGE:` footer | major |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `build:`, `style:` | none |

A breaking change must carry the footer:

```
feat: replace the mutating API with applyAction

BREAKING CHANGE: CreateAvalon and the Update* functions are removed;
use createGame and applyAction instead.
```

The `feat!:` shorthand is **not** recognised by the current release configuration — always use the `BREAKING CHANGE:` footer.

## Merging PRs

- Prefer **Create a merge commit** (the repository default) or **Rebase and merge**, so each commit message reaches `main` intact.
- If you squash, the squash commit becomes the only message semantic-release sees: make sure it follows Conventional Commits and keeps any `BREAKING CHANGE:` footer. GitHub suggests the PR title, so check it before confirming.
- Every merge into `main` may publish a new version to npm.

## Release flow

Releases are fully automated with [semantic-release](https://github.com/semantic-release/semantic-release). On every push to `main`, the **Release** workflow (`.github/workflows/release.yml`):

1. Installs dependencies, then runs `pnpm typecheck`, `pnpm test` and `pnpm build` — nothing is published if any of them fails.
2. Analyses the commits since the last release tag to pick the next version (see the table above). If no commit warrants a release, it stops here.
3. Updates `CHANGELOG.md` and the `version` in `package.json`, and publishes to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements).
4. Commits `chore(release): x.y.z [skip ci]` back to `main`, tags it `vx.y.z` and creates a GitHub release with the notes.

You don't need to bump versions, edit `CHANGELOG.md`, tag commits, or run `npm publish` by hand.

### Publishing credentials

Publishing uses npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) — there is **no long-lived `NPM_TOKEN`**.

One-time setup on npmjs.com → the package's *Settings → Trusted Publisher* → add:

- Organization: `avalon-app`
- Repository: `core`
- Workflow filename: `release.yml`

The release workflow already grants `id-token: write` and upgrades to the latest npm CLI so OIDC kicks in automatically. Provenance is attached as part of OIDC publishes.

`GITHUB_TOKEN` is provided automatically; semantic-release uses it to push the release commit, the tag and the GitHub release.

## CI

GitHub Actions runs on every push to `main` and on every PR (see `.github/workflows/ci.yml`):

- Install with `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

The matrix covers Node 22 / 24.

Keep `pnpm-lock.yaml` committed: CI installs from it with `--frozen-lockfile`, and it pins the exact toolchain that builds the published package.

## Reporting bugs

Open an issue at <https://github.com/avalon-app/core/issues> with a minimal reproduction.
