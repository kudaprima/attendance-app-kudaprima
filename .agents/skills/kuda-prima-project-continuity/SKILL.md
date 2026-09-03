---
name: kuda-prima-project-continuity
description: Preserve and recover verified PT Kuda Prima attendance project context when resuming work, planning the next milestone, reporting progress, changing product decisions, or handing work to another agent or contributor.
---

# Kuda Prima Project Continuity

Use repository evidence as the durable source of truth; conversation history and model memory
are supporting hints only.

1. Read `AGENTS.md`, `docs/project-status.md`, `docs/architecture.md`,
   `docs/domain-rules.md`, `docs/security-and-retention.md`, and `docs/roadmap.md` before
   evaluating status or selecting the next milestone.
2. Verify the snapshot against the current branch, `main` history, changed files, and relevant
   tests. Distinguish production-ready behavior, development-only behavior, UI placeholders,
   and roadmap items explicitly.
3. If code or test evidence conflicts with `docs/project-status.md`, report the mismatch and
   update the document in the same change that establishes the corrected state.
4. Update the snapshot date, baseline, completed evidence, remaining risks, and ordered next
   steps whenever a pull request changes a milestone or approved product decision.
5. Keep stable domain/security decisions in their dedicated documents instead of duplicating
   them in the status snapshot. Add an architecture decision record when a durable technical
   tradeoff needs rationale.
6. Never record credentials, employee data, attendance photos, signing material, or physical
   device serials in shared handoff documents. Use synthetic identifiers and the physical-device
   testing skill for local hardware operations.
7. Apply the GitHub governance skill for any branch, commit, push, pull request, or merge. A
   handoff does not imply authorization for external changes, deployment, billing, or release.

Before ending a milestone, ensure another capable contributor can identify what works, what was
actually tested, what remains, and the safest next action without reading prior chat messages.
