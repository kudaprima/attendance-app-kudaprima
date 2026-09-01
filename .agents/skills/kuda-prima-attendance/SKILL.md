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
   - Mobile/admin submit commands through Functions; raw attendance events are immutable.
   - Outside-office attendance is allowed with a required note and is not automatically an approval case.
   - Location and camera run only during attendance; gallery upload and background tracking stay disabled.
   - Self-approval is forbidden; timestamps are UTC in storage and WIB in UI.
   - Photos retain three months; attendance/audit data retain one year.
5. Add or update tests at the same layer as the change. Use Firebase Emulator Suite for backend authorization or persistence behavior.
6. Run the narrow checks first, then the full relevant quality gate from **AGENTS.md**.

Use **. .\scripts\use-dev-env.ps1** before commands on Windows so caches and AVD remain on drive D.

For any Git or GitHub mutation, also apply **.agents/skills/kuda-prima-github-governance**.

Never request passwords, OTPs, recovery codes, service-account keys, or signing certificates. Never deploy, enable billing, create production resources, or publish store builds without explicit user authorization.
