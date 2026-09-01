---
name: kuda-prima-github-governance
description: Apply repository-specific Git and GitHub governance when synchronizing branches, preparing commits, pushing, opening or reviewing pull requests, merging, or recovering Git state in kudaprima/attendance-app-kudaprima. Do not use for code work that involves no Git or GitHub operation.
---

# Kuda Prima GitHub Governance

Use this skill for every Git or GitHub operation in this repository.

1. Read **AGENTS.md**, **CONTRIBUTING.md**, and **docs/github-governance.md**.
2. Confirm that the worktree is `kudaprima/attendance-app-kudaprima`, the remote URL is canonical, and the current branch matches the intended operation.
3. Read [references/git-command-playbook.md](references/git-command-playbook.md) before executing or teaching commands. Select only the relevant workflow section.
4. Inspect status and diffs before staging, committing, switching, pulling, or pushing. Preserve unrelated user changes.
5. Run the quality gates for every affected component and report exactly which checks ran.

## Invariants

- `main` is the only long-lived branch. The initial bootstrap commit `325f84f` is the sole direct-push exception.
- Use short-lived branches named `feat/`, `fix/`, `docs/`, `test/`, `refactor/`, or `chore/` plus a kebab-case description.
- Use imperative Conventional Commits and squash merge pull requests.
- Never store tokens in commands or remotes. Authenticate HTTPS through Git Credential Manager.
- Never commit secrets, employee records, attendance photos, `.env` files, signing material, service-account JSON, or generated Firebase app configuration.
- Never force-push or delete `main`. Never use `git reset --hard`, `git clean -fd`, or discard commands as routine recovery.
- Correct published mistakes with a new commit or `git revert`; revoke exposed credentials before any history remediation.

## Authorization Boundary

Read-only inspection is allowed when relevant. Obtain explicit authorization immediately before external mutations such as push, pull request creation, merge, tag or release creation, remote branch deletion, or repository-setting changes unless the current user request already clearly authorizes that exact action. Deployment, GitHub secrets, webhooks, GitHub Apps, billing, and production changes always require separate explicit authorization.

GitHub Free cannot enforce protected branches on this private organization repository. Apply the documented process procedurally and recommend GitHub Team when a second contributor becomes active.
