# Manual Simulation Runbook

## Persistent development services

Open each PowerShell terminal at the repository root and activate its environment:

```powershell
Set-Location -LiteralPath 'D:\KudaPrima\Project Management\daily_attandance'
. .\scripts\use-dev-env.ps1
```

Restore dependencies once before starting services. Stop and inspect any failed command:

```powershell
pnpm install --frozen-lockfile
Push-Location apps\mobile
flutter pub get
Pop-Location
```

Terminal 1 runs the persistent Firebase suite:

```powershell
. .\scripts\use-dev-env.ps1
pnpm emulators:profile
```

No manual seed is needed. Existing Auth, Firestore and Storage snapshots are imported
from `.emulator-data/`. Only the first start without an export creates synthetic
accounts and profiles. Do not run destructive tests or reset the database used for
manual review. Rebuilding or reinstalling the APK with `adb install -r` preserves data.

The suite listens on loopback: Auth 9099, Firestore 8080, Functions 5001, Storage 9199,
UI http://127.0.0.1:4000. It checkpoints every minute and exports on orderly Ctrl+C.
Before a forced shutdown or important experiment run `pnpm emulators:save` in another
terminal. A sudden crash may lose changes after the last completed checkpoint.

## Run Android and admin

In terminal 2, start the Android 10 AVD and check its assigned device ID:

```powershell
.\scripts\start-android-emulator.ps1
flutter devices
```

In terminal 3, run mobile. Replace `emulator-5554` if `flutter devices` shows another ID:

```powershell
cd apps\mobile
flutter run --dart-define=USE_FIREBASE_EMULATORS=true -d emulator-5554
```

In terminal 4, start admin:

```powershell
pnpm dev:admin
```

Admin: http://localhost:5173. For physical Android use the physical-device runbook
and `FIREBASE_EMULATOR_HOST=127.0.0.1` after `adb reverse`. The Android AVD uses
10.0.2.2. Do not clear app data or uninstall to update a debug build.

For USB hardware, replace the AVD/mobile steps with the following from the root.
Use the actual ID from `adb devices -l`; `RXXXXXXXXXX` is a placeholder:

```powershell
adb devices -l
.\scripts\prepare-android-device.ps1 -Serial RXXXXXXXXXX
cd apps\mobile
flutter run -d RXXXXXXXXXX --dart-define=USE_FIREBASE_EMULATORS=true --dart-define=FIREBASE_EMULATOR_HOST=127.0.0.1
```

An AVD sample flagged as mock must block attendance. Use physical hardware for
camera/GPS acceptance; do not disable the mock-location guard to make a scenario pass.

## Synthetic accounts

| Role       | Email                         |
| ---------- | ----------------------------- |
| Technician | technician.dev@kudaprima.test |
| Supervisor | supervisor.dev@kudaprima.test |
| Admin      | admin.dev@kudaprima.test      |

Initial fixture password: `KudaPrimaDev2026#`. If changed locally, use the changed
password: restart and seeding do not reset existing passwords or re-enable accounts.
Enter credentials manually; account shortcuts have been removed.

## Review scenarios

1. Login shows the canonical company logo, Email, Kata Sandi, Lupa Kata Sandi and
   Masuk dengan Google. Wrong credentials show an error. Password reset creates an
   emulator OOB link (available through Auth Emulator); it does not send real email.
   Google sign-in in local mode explains that the real flow requires online Firebase.
2. Login as technician. The heading and first navigation item say Kehadiran. Before
   location capture the instruction is `Klik "Periksa Lokasi" untuk verifikasi`.
   Actions are Absen Masuk and Absen Keluar.
3. Capture location. Outside the office, Absen Masuk opens Catatan and refuses a blank
   note. Outside-office attendance remains valid and is not by itself an approval case.
   Mock location must block attendance. Do not bypass that restriction for simulation.
4. Continue to the selfie screen. It fills the Android screen in portrait/landscape;
   system safe areas protect controls. Take/retake/confirm a camera photo. Camera denial
   has a retry/error path and cannot submit a synthetic fallback photograph.
5. Submit once. Verify Firestore event and audit, then open Riwayat. Close/reopen the
   app: recorded check-in still enables only Absen Keluar. A second check-in is rejected
   server-side, even with a different request key. A completed daily pair remains closed.
   Check-in before 07.00 WIB is blocked; after 08.15 WIB it is late. Checkout before
   17.00 WIB is early departure. Late/early records require approval, but the approval
   backend is a later milestone. Use a fresh synthetic account or the next WIB day to
   repeat a completed daily pair; do not delete existing attendance to repeat the test.
6. Test network failure with synthetic data. The same pending command can be retried
   within the session without creating another event. Durable offline queue is not yet
   implemented; do not interpret the retry feature as offline availability.
7. Login to admin as technician: access denied. Login as manager: today's real events
   appear. Deactivate a synthetic manager profile in Emulator UI: access is blocked.
   Restore that test profile only if it was changed for this scenario.
8. Record account/event/photo counts, save and restart services, then login again.
   Verify the same data and photo downloads. Run automated tests and check again;
   the test suite must not modify the development dataset.

Approval Center, employee directory and CSV reports still contain demonstration
fixtures. Their UI does not demonstrate backend approval, payroll or administration.
Distribution QR/OTA are placeholders and are not acceptance criteria for this build.

## Isolated automated checks

```powershell
pnpm check
pnpm build
pnpm test:emulator:profile
cd apps\mobile
flutter analyze
flutter test
```

Integration tests start a separate demo project on Firestore 18180 and Storage 19299,
with hub 14400, logging 14500, and `.tmp/emulator-tests` as temporary directory. Keep
these ports free. Never point cleanup tests at the manual-development suite.
