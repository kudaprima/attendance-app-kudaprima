# GitHub Governance

## Repository Baseline

- Canonical repository: `kudaprima/attendance-app-kudaprima`
- Visibility: private
- Default branch: `main`
- Merge method: squash only
- Review policy: one approval from a non-author
- Authentication: HTTPS through Git Credential Manager and GitHub 2FA

The repository currently uses GitHub Free. GitHub does not provide protected branches or rulesets for a private organization repository on this plan, so the review and direct-push restrictions are procedural. Upgrade to GitHub Team when another contributor becomes active if server-enforced controls are required.

## Access Model

| Group                    | Repository role                      | Responsibility                                      |
| ------------------------ | ------------------------------------ | --------------------------------------------------- |
| Organization owners      | Admin through organization ownership | Access, billing, security, and destructive settings |
| `attendance-maintainers` | Maintain                             | Reviews, merges, issues, and repository hygiene     |
| `attendance-developers`  | Write                                | Branches, commits, reviews, and approved merges     |

Keep organization ownership limited, with a second trusted owner added when operationally possible. Add contributors as organization members and grant repository access through teams rather than one-off collaborator grants.

## Change Control

Use short-lived topic branches and pull requests into `main`. CI, the pull request template, CODEOWNERS, and `CONTRIBUTING.md` provide the current control layer. Self-approval is not accepted. During the one-person phase, document solo review as a temporary exception; the initial commit `325f84f` is the only approved direct bootstrap push.

Never force-push or delete `main`. Published mistakes are corrected with a new commit or `git revert`. Releases, tags, deployments, GitHub secrets, GitHub Apps, webhooks, and production environment changes require explicit authorization.

## GitHub Team Upgrade Checklist

When upgrading, create an active ruleset targeting `main` with:

- pull requests required before merging;
- one approving review and stale approval dismissal;
- resolution of review conversations required;
- CI status checks required;
- linear history required;
- force pushes and branch deletion blocked;
- rules applied to administrators, with no routine bypass.

Retain squash-only merging and automatic deletion of merged topic branches. Review the bypass list and organization audit log regularly.
