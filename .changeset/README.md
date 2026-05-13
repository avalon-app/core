# Changesets

This directory holds [changesets](https://github.com/changesets/changesets) — short markdown files describing what changed in a PR and how the next release should bump the version.

## Adding a changeset

```bash
pnpm changeset
```

Pick a bump level (patch / minor / major) and write a short user-facing summary. Commit the generated `.changeset/<random>.md` along with your code change.

## How the release flows

1. You merge PRs that include changeset files into `main`.
2. The **Release** workflow opens (or updates) a `chore: release` PR that
   - bumps `package.json`,
   - regenerates `CHANGELOG.md`,
   - removes the consumed changeset files.
3. Merging that PR triggers the same workflow to publish to npm.

See `.github/workflows/release.yml`.
