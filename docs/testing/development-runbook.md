# Development Emulator and Device Runbook

Run commands from the repository root in separate PowerShell terminals. Start every terminal
with `. .\scripts\use-dev-env.ps1` so caches and Android tooling stay on drive D.

## Auth Emulator Only

Use this only for isolated login testing; it does not provide employee profiles or office data.

```powershell
# Terminal 1 - keep running
. .\scripts\use-dev-env.ps1
pnpm emulators:auth

# Terminal 2 - run after Auth reports ready
. .\scripts\use-dev-env.ps1
pnpm emulators:auth:seed
```

Stop the emulator with `Ctrl+C` in terminal 1.

## Android Emulator (Recommended Full App Test)

```powershell
# Terminal 1 - Auth, Firestore, and Functions
. .\scripts\use-dev-env.ps1
pnpm emulators:profile

# Terminal 2 - synthetic accounts, profiles, and officeLocations/main
. .\scripts\use-dev-env.ps1
pnpm emulators:profile:seed

# Terminal 3 - start the Android 10 AVD
. .\scripts\use-dev-env.ps1
.\scripts\start-android-emulator.ps1

# Terminal 4 - run Flutter after the AVD finishes booting
. .\scripts\use-dev-env.ps1
Set-Location .\apps\mobile
flutter run --dart-define=USE_FIREBASE_EMULATORS=true
```

The AVD must display Firebase hosts through `10.0.2.2`. Stop Flutter with `q` and the Firebase
suite with `Ctrl+C`.

## Physical Android Device

Keep the full profile emulator and seeder from terminals 1 and 2 above. Connect and unlock the
phone, enable USB debugging, then run:

```powershell
# Terminal 3 - verify USB and forward local Firebase ports
. .\scripts\use-dev-env.ps1
.\scripts\prepare-android-device.ps1

# Terminal 4 - use the ID printed by flutter devices
. .\scripts\use-dev-env.ps1
Set-Location .\apps\mobile
flutter devices
flutter run -d <DEVICE_ID> --dart-define=USE_FIREBASE_EMULATORS=true --dart-define=FIREBASE_EMULATOR_HOST=127.0.0.1
```

Do not type the angle brackets; replace `<DEVICE_ID>` with the detected device ID. A physical
device must show `127.0.0.1` in the development banner. Rerun the preparation helper after USB
disconnect, phone reboot, or ADB restart. Use only synthetic development accounts.

## Required Visual Smoke Check

On every material mobile UI change, verify the PT Kuda Prima logo appears on login, the neutral
background and blue/orange/purple semantic accents remain visible, text is readable, and no
screen falls back to the default Material seed theme. Run `pnpm check:brand` before committing.
