# Git Command Playbook

Run these examples in PowerShell from `D:\KudaPrima\Project Management\daily_attandance`. Comments beginning with `#` explain intent and do not change state.

## Safety Rules

- Stop when a command fails; inspect the error before choosing another command.
- Never paste a password, PAT, OTP, recovery code, private key, or service-account key into a command.
- Do not use bare `git pull`; specify `--ff-only` and the remote branch.
- Do not use `--force`. `--force-with-lease` is also prohibited on shared branches and requires explicit case-specific approval elsewhere.
- Do not use `git reset --hard`, `git clean -fd`, or `git checkout -- <path>` as routine cleanup.
- Replace placeholders such as `<branch>`; do not type angle brackets literally.

## Inspect Repository State

```powershell
# Enter the canonical local repository without relying on the current directory.
Set-Location -LiteralPath 'D:\KudaPrima\Project Management\daily_attandance'

# Activate project tool paths and D: caches in this PowerShell session.
. .\scripts\use-dev-env.ps1

# Confirm the repository root, branch, worktree, and canonical remote.
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git remote -v
git remote get-url origin
```

Expected remote:

```text
https://github.com/kudaprima/attendance-app-kudaprima.git
```

Stop if the URL, repository root, or branch is unexpected. Do not repair a remote blindly.

## Configure a Contributor Once

Use the contributor's professional name and exact GitHub-provided `noreply` email. Repository-local configuration avoids affecting unrelated repositories.

```powershell
# Record authorship only for this repository.
git config --local user.name 'Full Name'
git config --local user.email 'ID+username@users.noreply.github.com'

# Prevent accidental merge commits from pull and prune stale remote references.
git config --local pull.ff only
git config --local fetch.prune true
git config --local push.default simple

# Verify effective local values without exposing credentials.
git config --local --get user.name
git config --local --get user.email
git config --local --get pull.ff
git config --local --get fetch.prune
git config --local --get push.default
```

Git for Windows includes Git Credential Manager. The first authenticated fetch or push should open a browser and respect 2FA. Stop if Git asks for a password or token directly in the terminal.

## Clone for a New Team Member

```powershell
# Choose an explicit location on D: and clone over HTTPS.
Set-Location -LiteralPath 'D:\KudaPrima\Project Management'
git clone https://github.com/kudaprima/attendance-app-kudaprima.git
Set-Location -LiteralPath '.\attendance-app-kudaprima'

# Apply the local identity and safety configuration from the previous section.
git status --short --branch
git remote -v
```

Never copy another contributor's `.git` directory or Windows credential entries.

## Start New Work

```powershell
# Fetch metadata without modifying local files.
git fetch --prune origin

# Update main only by fast-forward, then create a topic branch.
git switch main
git pull --ff-only origin main
git switch -c feat/short-kebab-case-description

# Confirm that work will not be committed directly to main.
git status --short --branch
```

Choose one prefix: `feat/`, `fix/`, `docs/`, `test/`, `refactor/`, or `chore/`.

## Inspect and Stage Changes

```powershell
# List tracked and untracked changes before staging.
git status --short --untracked-files=all

# Review tracked changes; this does not show untracked file contents.
git diff
git diff --stat

# Stage deliberately. Use a path for a focused commit; use --all only after review.
git add -- path/to/file
# git add --all

# Review exactly what the next commit will contain.
git diff --cached --name-status
git diff --cached --stat
git diff --cached

# Detect whitespace errors. No output means the check passed.
git diff --cached --check
```

Before committing, ensure staged names exclude `.env`, credentials, private keys, service-account JSON, signing files, `node_modules`, `.dart_tool`, `build`, coverage, employee records, and attendance photos. `.env.example` is allowed.

To unstage without deleting a local file:

```powershell
# Remove a path from the next commit while preserving its working copy.
git restore --staged -- path/to/file
```

## Run Quality Gates

Dot-source the environment script once; do not append commands as arguments because `use-dev-env.ps1` only configures the current PowerShell session.

```powershell
# From repository root: JavaScript/TypeScript dependencies and full checks.
. .\scripts\use-dev-env.ps1
pnpm install --frozen-lockfile
pnpm format:check
pnpm check
pnpm build

# Flutter checks run from the mobile package.
Push-Location .\apps\mobile
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
Pop-Location
```

Run the checks relevant to the changed component at minimum. Backend authorization, persistence, Firestore, Storage, approval, or retention changes also require Emulator Suite integration tests. If a command fails, stop; do not bypass checks or silently alter dependencies.

Re-stage legitimate formatter or lockfile changes, then repeat staged-diff inspection.

## Commit

```powershell
# Confirm the topic branch and staged contents immediately before commit.
git branch --show-current
git status --short
git diff --cached --check

# Use an imperative Conventional Commit describing one concern.
git commit -m 'feat(mobile): add attendance note validation'

# Verify the resulting commit and confirm no unexpected files remain.
git show --stat --oneline --decorate HEAD
git status --short --branch
```

Common scopes are `mobile`, `admin`, `functions`, `contracts`, `firebase`, `ci`, and `docs`. Use `docs: ...` or `chore: ...` without a scope when clearer.

## Push a Topic Branch

Pushing changes GitHub state. Confirm that the task explicitly authorizes it immediately before running:

```powershell
# Reconfirm the branch, remote, commit, and clean worktree.
git branch --show-current
git remote get-url --push origin
git log -1 --oneline --decorate
git status --short --branch

# Publish the topic branch and establish upstream tracking.
git push -u origin HEAD

# Verify local tracking after the push. Replace the placeholder.
git status --short --branch
git ls-remote --heads origin <branch>
```

Never push directly to `main`. Never include a token in the URL.

## Open and Review a Pull Request

The current standard uses Git plus the GitHub web interface; GitHub CLI is not a project dependency.

1. Open `https://github.com/kudaprima/attendance-app-kudaprima/pulls`.
2. Create a pull request from the topic branch into `main`.
3. Complete every applicable section of the pull request template.
4. Record the exact checks run and use synthetic data in screenshots.
5. Request the CODEOWNER or another contributor. The author cannot supply the required approval.
6. Resolve every review conversation and wait for CI before merging.
7. Use **Squash and merge**, then allow GitHub to delete the remote topic branch.

During the solo GitHub Free phase, clearly record the temporary lack of independent approval. Do not represent a self-review as an approval.

## Continue Work After Review

```powershell
# Return to the existing topic branch and inspect remote updates.
git switch <branch>
git fetch --prune origin
git status --short --branch

# Fast-forward if the same remote branch has new commits.
git pull --ff-only origin <branch>

# Make requested changes, rerun checks, commit, and push normally.
git push origin HEAD
```

If `--ff-only` refuses because histories diverged, stop and inspect:

```powershell
git log --oneline --graph --decorate --all -20
```

Do not force-push or start an unplanned rebase.

## Bring Main into a Topic Branch

Use this only when the pull request needs current `main` and the worktree is clean:

```powershell
git fetch --prune origin
git switch <branch>
git merge --no-edit origin/main
```

Resolve conflicts deliberately, stage only resolved files, run all relevant checks, then commit if Git has not created the merge commit automatically. Squash merging keeps `main` linear without rewriting the shared topic branch.

To cancel an unresolved merge safely:

```powershell
git merge --abort
```

## After a Pull Request Is Merged

```powershell
# Update local main after GitHub completes the squash merge.
git switch main
git fetch --prune origin
git pull --ff-only origin main

# Delete only an already-merged local topic branch after verifying its name.
git branch --merged main
git branch -d <branch>

# Confirm local and remote main agree.
git status --short --branch
git log -1 --oneline --decorate
```

Do not use `-D` when `-d` refuses; investigate why Git considers the branch unmerged.

## Safe Corrections

Unstage a file without discarding it:

```powershell
git restore --staged -- path/to/file
```

Correct the most recent commit only when it has never been pushed:

```powershell
# Inspect first, stage the correction, then replace the unpublished commit.
git status --short --branch
git add -- path/to/file
git commit --amend
```

Undo a published commit with an auditable inverse commit:

```powershell
# Inspect the target, then create a new revert commit without rewriting history.
git show --stat <commit-sha>
git revert <commit-sha>
```

If a secret was exposed, revoke or rotate it first and notify the owner privately. A revert, deletion, or `.gitignore` entry does not remove the secret from Git history.

## Prohibited Without Separate Authorization

Do not run these as part of ordinary work:

```text
git push --force
git push --force-with-lease
git reset --hard
git clean -fd
git branch -D <branch>
git push origin --delete <branch>
git tag ...
git push --tags
```

Tags, releases, remote-branch deletion outside GitHub post-merge cleanup, history rewriting, repository transfers, visibility changes, webhooks, GitHub Apps, secrets, and deployment settings each require explicit case-specific authorization.
