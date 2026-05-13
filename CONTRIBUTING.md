# Contributing

Thanks for considering a contribution to `@avalon-app/core`!

## Prerequisites

- Node.js >= 18
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
| `pnpm changeset` | Record a user-facing change for the next release. |

## Branching & PRs

- Branch off `main`.
- Keep PRs focused. A bug fix doesn't need surrounding refactors.
- The PR template will remind you about the changeset, tests, and typecheck.

## Adding a changeset

Any PR that affects published behavior must include a changeset:

```bash
pnpm changeset
```

Pick the bump level (patch / minor / major) and write a short summary aimed at users. Commit the resulting `.changeset/<random>.md` file with your code change. Internal-only PRs (CI tweaks, README typos) can skip it.

Bump-level guide:
- **patch** — bug fixes, doc tweaks, internal refactors that don't change the public API.
- **minor** — new public APIs, additive features, backwards-compatible changes.
- **major** — breaking API/behavior changes.

## Release flow

Releases are fully automated via [Changesets](https://github.com/changesets/changesets):

1. PRs with changesets land on `main`.
2. The **Release** workflow opens (or updates) a `chore: release` PR that bumps the version, regenerates `CHANGELOG.md`, and removes the consumed changeset files.
3. Merging that PR re-triggers the workflow, which runs `pnpm build && changeset publish` and pushes to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements) attached.

You don't need to bump versions, tag commits, or run `npm publish` by hand.

### Publishing credentials

Publishing uses npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) — there is **no long-lived `NPM_TOKEN`**.

One-time setup on npmjs.com → the package's *Settings → Trusted Publisher* → add:

- Organization: `avalon-app`
- Repository: `core`
- Workflow filename: `release.yml`

The release workflow already grants `id-token: write` and upgrades to the latest npm CLI so OIDC kicks in automatically. Provenance is attached as part of OIDC publishes.

`GITHUB_TOKEN` is provided automatically.

## CI

GitHub Actions runs on every push and PR (see `.github/workflows/ci.yml`):

- Install with `pnpm install --frozen-lockfile`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

The matrix covers Node 18 / 20 / 22.

## Reporting bugs

Open an issue at <https://github.com/avalon-app/core/issues> with a minimal reproduction.
