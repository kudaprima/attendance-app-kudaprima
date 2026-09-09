---
name: kuda-prima-android-device-testing
description: Prepare, run, and diagnose the PT Kuda Prima Flutter app on a physical Android device over USB against the local Firebase Emulator Suite on Windows. Use for Samsung or other Android hardware testing, not for AVD-only runs or production distribution.
---

# Kuda Prima Android Device Testing

## Required Context

1. Read `AGENTS.md`, `docs/development.md`, `docs/testing/development-runbook.md`, and
   `docs/testing/android-physical-device.md`.
2. Apply `kuda-prima-attendance` for application changes and `kuda-prima-github-governance` for Git or GitHub operations.

## Workflow

1. Diagnose read-only first with `adb devices -l`, `flutter devices`, and `adb -s <serial> reverse --list`.
2. Distinguish network targets: an Android AVD uses `10.0.2.2`; USB hardware uses `127.0.0.1` after `adb reverse`.
3. Run `scripts/prepare-android-device.ps1`. If multiple physical devices are present, pass `-Serial <device-id>`.
4. Start persistent Firebase through the repository commands; saved data is restored automatically. Use only synthetic accounts and do not reseed/reset the manual dataset.
5. Run Flutter with both `USE_FIREBASE_EMULATORS=true` and `FIREBASE_EMULATOR_HOST=127.0.0.1`.
6. Preserve the release-mode emulator guard. Never bind local Firebase services to the LAN merely to reach a phone.
7. Rerun the preparation script after disconnecting or rebooting the device or restarting ADB.
8. Report the exact device state, reverse mappings, run command, scenario results, and relevant logs. Do not mark camera, location, geofence, or anti-fraud behavior as verified until those features exist.
9. For material UI changes, apply `kuda-prima-ui-governance`, run `pnpm check:brand`, and verify
   the login logo plus shared palette on the physical device before accepting the smoke test.

## Safety

- Treat Developer options and USB debugging as a temporary development exception, not a production policy change.
- Do not wipe a device, remove personal data, alter global Android settings, or revoke trust without explicit user direction.
- Never use real employee credentials, photos, locations, or attendance records in emulator-backed tests.
