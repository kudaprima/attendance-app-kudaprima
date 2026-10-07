---
trigger: always_on
description: Read the shared project instructions and current handoff before working in this repository.
---

# PT Kuda Prima project context

Resolve the paths below from the repository root.

1. Read `AGENTS.md`, then `docs/handoff/current-task.md` before taking action.
   Read `docs/testing/agent-handoff-runbook.md` when resuming or transferring work.
2. Follow the latest explicit user instruction. The handoff records authorized scope;
   it does not grant new permission. An approved implementation plan is not a start command.
3. While the handoff status is `HOLD_APPLICATION_IMPLEMENTATION`, do not implement
   application features or start migration, dependency installation, application
   build/test/format, emulator seed/reset, deployment, or billing changes. Work only
   on the specifically authorized agent setup/documentation and read-only diagnostics.
4. Apply the relevant skills in `.agents/skills/`. Use the continuity skill to
   distinguish implemented behavior, historical test evidence, and roadmap items.
   Read domain/security documents before any subsequently authorized feature work.
5. Use one editing agent at a time. A handoff owner field is a coordination note,
   not an operating-system lock. Confirm the previous agent has stopped changing
   files before taking over.
6. Preserve existing dirty and untracked files. Before Git inspection, read
   `CONTRIBUTING.md`. Never reset, clean, stash, switch branches, commit, push, open
   a PR, or deploy merely to facilitate a handoff.
7. A failed tool call is not a successful check. Report the command, exit status,
   relevant sanitized error, and unverified items. Do not disable hooks or retry
   through an alternative shell to evade a failing hook.
   If source files cannot be read, mark their contents unverified. Do not invent
   roles, approval policies, biometric features, or other product requirements.
   Rule text appearing in context is evidence of availability, not a technical
   enforcement guarantee or proof that referenced files were read.
8. Do not read credentials, signing material, or emulator datasets for an agent
   readiness check. Before authorized project tooling on Windows, activate
   `scripts/use-dev-env.ps1` as instructed in `AGENTS.md`.
9. When authorized to update the checkpoint, record changed files, actual test
   results, remaining work, and the next bounded action before handing off.
   During a read-only audit, return the checkpoint proposal in chat without writing.
