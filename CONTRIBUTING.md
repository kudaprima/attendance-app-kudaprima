# Contributing to Kuda Prima Attendance

This private repository uses a short-lived branch and pull request workflow. The canonical remote is `https://github.com/kudaprima/attendance-app-kudaprima.git`; `main` is the only long-lived branch.

## Access and Responsibilities

- **Developer (`Write`)**: create branches, push changes, review, and merge approved pull requests.
- **Maintainer (`Maintain`)**: perform the same development workflow and manage issues, releases, and repository hygiene.
- **Organization Owner**: manage access, billing, security settings, and destructive repository operations.

Grant access through GitHub teams when the second contributor joins. Do not share accounts, passwords, tokens, signing keys, or Firebase service-account files.

## Development Workflow

Start from an updated `main`:

```powershell
. .\scripts\use-dev-env.ps1
git fetch --prune origin
git switch main
git pull --ff-only origin main
git switch -c feat/short-description
```

Use `feat/`, `fix/`, `docs/`, `test/`, `refactor/`, or `chore/` followed by a lowercase kebab-case description. Never work directly on `main` after the initial repository bootstrap.

Before committing, inspect both unstaged and staged changes. Run `pnpm check` and `pnpm build` for JavaScript/TypeScript changes. From `apps/mobile`, run `dart format --output=none --set-exit-if-changed lib test`, `flutter analyze`, and `flutter test` for Flutter changes. Backend authorization or persistence changes also require Firebase Emulator Suite tests.

Use Conventional Commits:

```text
feat(mobile): add attendance note validation
fix(functions): reject self approval
docs: document GitHub contribution workflow
```

Keep generated files, unrelated formatting, and multiple concerns out of the same commit.

## Pull Requests

Push the topic branch and open a pull request into `main`. Complete the repository template, link an issue when one exists, and include screenshots for UI changes. Document tests and any security, employee-data, migration, retention, or rollback impact.

One approval from someone other than the author is required once a second contributor is available. Both developers and maintainers may merge an approved PR using **Squash and merge**. Delete the topic branch afterward. Never merge a PR with failing CI or unresolved review comments.

GitHub Free does not enforce protected branches on this private organization repository. Until the plan is upgraded, these controls are procedural and every contributor is responsible for following them.

## Sensitive Changes

Do not commit `.env` files, credentials, employee records, attendance photos, private keys, app-signing material, or service-account JSON. If a secret is exposed, stop pushing, revoke or rotate it immediately, and notify the organization owner privately. Removing a secret in a later commit does not make the original exposure safe.
