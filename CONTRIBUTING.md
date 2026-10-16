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
- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) format — they decide the next release and its changelog (see below).
- The PR template will remind you about tests, typecheck, docs and commit messages.

## Commit messages

[release-please](https://github.com/googleapis/release-please) computes the next version and the changelog from the commit messages that land on `main`, so every commit must follow Conventional Commits:

```
<type>(<optional scope>): <summary>

<optional body>

<optional footers>
```

| Commit | Release |
| --- | --- |
| `fix: …`, `perf: …`, `revert: …` | patch |
| `feat: …` | minor |
| `feat!: …` (any type with `!`), or any type with a `BREAKING CHANGE:` footer | major |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `build:`, `style:` | none on their own (left out of the changelog) |

A breaking change is marked with `!` after the type/scope, or with a `BREAKING CHANGE:` footer. The footer is the better place to explain the migration — it becomes the "⚠ BREAKING CHANGES" entry in the changelog:

```
feat!: replace the mutating API with applyAction

BREAKING CHANGE: CreateAvalon and the Update* functions are removed;
use createGame and applyAction instead.
```

To force a specific version (for example a major bump for a change that isn't breaking by itself), add a `Release-As:` footer to any commit — including an empty one:

```bash
git commit --allow-empty -m "chore: release 3.0.0" -m "Release-As: 3.0.0"
```

## Merging PRs

- Prefer **Create a merge commit** (the repository default) or **Rebase and merge**, so each commit message reaches `main` intact.
- If you squash, the squash commit becomes the only message release-please sees: make sure it follows Conventional Commits and keeps any `BREAKING CHANGE:` footer. GitHub suggests the PR title, so check it before confirming.
- Merging a feature or fix PR does **not** publish anything — it only updates the open release PR (see below).

## Release flow

Releases are managed by [release-please](https://github.com/googleapis/release-please) through a **release PR**. On every push to `main`, the **Release** workflow (`.github/workflows/release.yml`) runs [release-please-action](https://github.com/googleapis/release-please-action):

1. It reads the Conventional Commits since the last release (`vX.Y.Z` tag) and opens — or updates — a release PR titled `chore(main): release X.Y.Z`. The PR bumps `version` in `package.json` and `.release-please-manifest.json` and prepends the new section to `CHANGELOG.md`. If no commit since the last release is user-facing (only `docs:`, `chore:`, `ci:` and the like), no release PR is opened.
2. More merges into `main` keep updating that same PR: the version and changelog are recomputed each time, so several changes can be batched into one release.
3. **Merging the release PR is what publishes.** The run triggered by that merge tags the merge commit `vX.Y.Z` and creates the GitHub release with the notes, then the `publish` job checks out the tag, runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test` and `pnpm build`, and runs `npm publish` with [provenance](https://docs.npmjs.com/generating-provenance-statements). Nothing is published if any of those steps fails.

You don't need to bump versions, edit `CHANGELOG.md`, tag commits, or run `npm publish` by hand.

Notes:

- Review the changelog in the release PR before merging it. Manual edits to the release PR are overwritten whenever release-please refreshes it (on every push to `main`), so fix wording at the source — the commit messages, or, for a squash-merged PR, a `BEGIN_COMMIT_OVERRIDE` … `END_COMMIT_OVERRIDE` block in that PR's description.
- Don't remove the `autorelease: pending` / `autorelease: tagged` labels: release-please uses them to find the release PR it has to tag.
- If the `publish` job fails after the GitHub release was created, fix the cause and use **Re-run failed jobs** on that workflow run. Re-running the whole workflow won't publish: release-please has already tagged the release, so `release_created` is false on the second run.

### Release PRs don't trigger CI

The release PR is opened with the workflow's default `GITHUB_TOKEN`, and GitHub doesn't start other workflows for events caused by that token. So **CI (`ci.yml`) doesn't run on the release PR**. That's fine today: the release PR only changes the version and the changelog, `main` isn't branch-protected, and the `publish` job runs typecheck, tests and build again before anything reaches npm.

If required status checks are added to `main` later, the release PR would wait forever for checks that never start. Then give release-please a token whose events do trigger workflows, and pass it to the action with `token:`:

- **GitHub App (preferred):** install an app with *Contents* and *Pull requests* read/write on this repository, store its ID and private key as secrets, mint a token with [`actions/create-github-app-token`](https://github.com/actions/create-github-app-token) in the `release-please` job and pass it as `token: ${{ steps.app-token.outputs.token }}`.
- **Fine-grained PAT:** a token scoped to this repository with *Contents* and *Pull requests* read/write, stored as a secret (for example `RELEASE_PLEASE_TOKEN`) and passed as `token: ${{ secrets.RELEASE_PLEASE_TOKEN }}`. It's tied to a person and expires, so the app is easier to keep running.

Until then, a one-off workaround for a single release PR is to close and reopen it, which runs CI as you.

### Publishing credentials

Publishing uses npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) — there is **no long-lived `NPM_TOKEN`**.

One-time setup on npmjs.com → the package's *Settings → Trusted Publisher* → add:

- Organization: `avalon-app`
- Repository: `core`
- Workflow filename: `release.yml`

The `publish` job grants `id-token: write` (only that job does) and upgrades to the latest npm CLI so OIDC kicks in automatically. Provenance is attached as part of OIDC publishes. Keep the workflow file named `release.yml`, or update the trusted publisher on npmjs.com to match.

`GITHUB_TOKEN` is provided automatically; release-please uses it to open the release PR, tag the release and create the GitHub release.

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
