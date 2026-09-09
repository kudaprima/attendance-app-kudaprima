# Development Emulator and Device Runbook

Start PowerShell in the repository root and run `. .\scripts\use-dev-env.ps1`.

Follow [manual-simulation-runbook.md](manual-simulation-runbook.md) for persistent
Auth/Firestore/Functions/Storage startup, synthetic login, Android AVD, web admin,
automated checks and restart verification. `pnpm emulators:profile` restores saved
data and bootstraps only the first empty workspace; no separate seed step is required.

For isolated Auth testing, `pnpm emulators:auth` uses a separate Auth-only export.
Do not run it concurrently with the full suite on port 9099.

For USB Android, follow [android-physical-device.md](android-physical-device.md).
Always use synthetic accounts and preserve the release-mode emulator guard. Run
`pnpm check:brand` and verify logo, readable controls and shared palette after UI changes.
