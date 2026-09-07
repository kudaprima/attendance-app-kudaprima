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
5. For branches created before a UI/branding pull request merged, bring current `origin/main`
   into the topic branch before device testing. Run `pnpm check:brand` and verify the canonical
   login logo/theme so an older feature branch cannot silently restore default styling.
6. Keep stable domain/security decisions in their dedicated documents instead of duplicating
   them in the status snapshot. Add an architecture decision record when a durable technical
   tradeoff needs rationale.
7. Never record credentials, employee data, attendance photos, signing material, or physical
   device serials in shared handoff documents. Use synthetic identifiers and the physical-device
   testing skill for local hardware operations.
8. Apply the GitHub governance skill for any branch, commit, push, pull request, or merge. A
   handoff does not imply authorization for external changes, deployment, billing, or release.
9. For emulator and manual verification:
   - Start the Android 10 AVD via `.\scripts\start-android-emulator.ps1`.
   - Launch the Firebase suite including storage and seed data via `pnpm emulators:profile`.
   - Run the mobile app with `--dart-define=USE_FIREBASE_EMULATORS=true` and verify flows using synthetic test accounts (`technician.dev@kudaprima.test`).
   - Run the web admin portal via `pnpm dev:admin` (`http://localhost:5173`), verify `LoginPage`, test RBAC rejection on `technician.dev@kudaprima.test`, verify managerial access on `admin.dev` and `supervisor.dev`, check cross-approval protection on `/persetujuan`, and verify QR Code generation on `/distribusi`.
   - Consult `docs/testing/manual-simulation-runbook.md` for the exact step-by-step terminal execution playbook.

Before ending a milestone, ensure another capable contributor can identify what works, what was
actually tested, what remains, and the safest next action without reading prior chat messages.
