---
name: kuda-prima-attendance
description: Apply PT Kuda Prima attendance architecture, domain, security, retention, and repository standards when implementing, reviewing, testing, or planning changes in this repository.
---

# Kuda Prima Attendance

Use this workflow for every product or code change in this repository.

1. Read **AGENTS.md**.
2. Read **docs/architecture.md**, **docs/domain-rules.md**, and **docs/security-and-retention.md**. For setup or account work, also read **docs/development.md** and **docs/setup/external-accounts.md**.
3. Identify the affected boundary: Flutter mobile, React admin, Cloud Functions, Firebase rules, or shared contracts.
4. Preserve these invariants:
   - Technical Firebase Project ID is exactly **kuda-prima-attandance-dev**; user-facing names use **attendance**.
   - Mobile client is distributed as a **Sideloaded Android APK via QR Code** (target Android 10+ / API 29+); Google Play Store and Apple App Store distributions are not required.
   - Web Admin Portal is protected by `AdminAuthGate` with Firebase Auth and custom claims (`admin`, `supervisor`); technicians (`technician`) are strictly blocked from the web portal.
   - Mobile/admin submit commands through Functions; raw attendance events are immutable.
   - Outside-office attendance is allowed with a required note and is not automatically an approval case.
   - Location and camera run only during attendance; gallery upload and background tracking stay disabled.
   - Self-approval is forbidden across all approval workflows (Cross-approval is mandatory); timestamps are UTC in storage and WIB in UI.
   - Annual leave (cuti) quota of 12 days/year requires $\ge 1$ year tenure for permanent/contract employees (no half days, min H-1); sick leave allows submission up to H+3.
   - Employee profile updates from client are strictly limited to contact information (`phone`, `homeAddress`); corporate fields are locked in Firestore rules.
   - Photos retain three months; attendance/audit data retain one year.
5. Add or update tests at the same layer as the change. Use Firebase Emulator Suite for backend authorization or persistence behavior.
6. Run the narrow checks first, then the full relevant quality gate from **AGENTS.md**.

For screen, layout, color, logo, theme, or shadcn changes, also apply
**.agents/skills/kuda-prima-ui-governance**. Preserve the shared brand gate when adding product
features; do not replace the root Flutter theme or admin semantic tokens with feature-local styles.

When a product rule, workflow, or accepted invariant changes, review and update the related
domain/security docs, ADR, repository skill, test runbook, and automated guardrail in the same
change. Leave unrelated governance files untouched when they remain accurate.

Use **. .\scripts\use-dev-env.ps1** before commands on Windows so caches and AVD remain on drive D.

For any Git or GitHub mutation, also apply **.agents/skills/kuda-prima-github-governance**.

Never request passwords, OTPs, recovery codes, service-account keys, or signing certificates. Never deploy, enable billing, create production resources, or publish store builds without explicit user authorization.

Apply ADR 0004 for atomic/idempotent online attendance, private daily state, JPEG
validation, standard login and persistent local development. Durable offline queue
and backend approval workflows remain subsequent milestones.
