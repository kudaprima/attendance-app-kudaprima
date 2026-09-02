# Android Physical Device Testing

This workflow runs the Flutter development build on a physical Android phone while Firebase Auth, Firestore, and Functions remain local on the Windows development computer. It is intended for the Samsung Galaxy M15 5G and other supported Android devices.

## Safety Boundary

- Use only synthetic development accounts and the Firebase project `kuda-prima-attandance-dev`.
- Never remove the release-mode emulator guard or expose emulator ports to the LAN.
- Developer options are a temporary development exception. The future employee release must still detect and reject developer mode or mock location according to the security requirements.
- `adb reverse` sends device traffic for selected localhost ports through USB. It does not enable 24-hour location tracking.

## 1. Prepare the Samsung Galaxy M15 5G

1. Use a trusted USB-C cable that supports data, unlock the phone, and connect it to Windows.
2. Open **Settings > About phone > Software information**.
3. Tap **Build number** seven times and confirm the phone PIN. Return to **Settings > Developer options**.
4. Enable **USB debugging**.
5. If One UI blocks USB debugging or USB commands, open **Settings > Security and privacy > Auto Blocker** and temporarily disable Auto Blocker for this session. Menu labels can vary by One UI version.
6. When the RSA prompt appears, choose **Allow**. Select **Always allow from this computer** only because this is a trusted development PC.

If Windows does not detect the phone, change the phone's USB mode to **Transferring files / Android Auto**. Install the official Samsung Android USB Driver only if `adb devices -l` still shows no hardware device.

## 2. Start Local Services

Open PowerShell at the repository root in terminal 1:

```powershell
. .\scripts\use-dev-env.ps1
pnpm emulators:profile
```

Wait until every service included by the command reports ready, then keep this terminal running. After the employee-profile PR is merged, this profile includes Auth, Firestore, and Functions. In terminal 2, seed only synthetic development data:

```powershell
. .\scripts\use-dev-env.ps1
pnpm emulators:profile:seed
```

The profile seed command is available after the employee-profile PR is merged. Until then, use the existing Auth seed command.

## 3. Prepare the USB Route

In terminal 3 at the repository root, run:

```powershell
.\scripts\prepare-android-device.ps1
```

The helper selects one physical device, rejects `offline` or `unauthorized` states, and maps device-local ports `9099`, `8080`, and `5001` to the same ports on Windows. If multiple phones are attached, specify the serial shown by `adb devices -l`:

```powershell
.\scripts\prepare-android-device.ps1 -Serial RXXXXXXXXXX
```

Run the helper again after the phone is rebooted, USB is disconnected, or the ADB server is restarted.

## 4. Run the Flutter App

```powershell
cd apps\mobile
. .\..\..\scripts\use-dev-env.ps1
flutter devices
flutter run -d RXXXXXXXXXX --dart-define=USE_FIREBASE_EMULATORS=true --dart-define=FIREBASE_EMULATOR_HOST=127.0.0.1
```

Replace `RXXXXXXXXXX` with the actual serial. A physical phone uses `127.0.0.1` through `adb reverse`; `10.0.2.2` is only for the Android emulator. The application banner must show Firebase emulator hosts at `127.0.0.1`.

## 5. First Test Scenarios

Record pass/fail and any device log for each scenario:

1. Install and launch the debug build without a crash.
2. After the employee-profile PR is merged, sign in with the seeded technician, supervisor, and admin accounts; verify each displayed role and employee ID.
3. Reject a wrong password without creating a session.
4. Sign out, close the app, reopen it, and sign in again.
5. Disconnect USB while the app is open; confirm the app reports backend failure without corrupting state.
6. Reconnect USB, rerun the preparation helper, and confirm login recovers.
7. Check the Emulator Suite UI to confirm that only synthetic Auth and Firestore records were used.

Camera, location accuracy, geofence, offline attendance, and anti-mock-location scenarios should be added when those features exist. Do not simulate them as completed based only on the login foundation.

## Troubleshooting and Cleanup

Use these read-only checks first:

```powershell
. .\scripts\use-dev-env.ps1
adb devices -l
adb -s RXXXXXXXXXX reverse --list
flutter devices
flutter logs -d RXXXXXXXXXX
```

- `unauthorized`: unlock the phone, revoke USB debugging authorizations if needed, reconnect, and accept the new RSA prompt.
- no device: verify the data cable, File Transfer USB mode, another USB port, then the Samsung driver.
- Firebase unavailable: confirm the Emulator Suite is running and all three reverse mappings appear.
- more than one target: pass the physical serial explicitly to both the helper and `flutter run`.

Stop `flutter run` with `q`. After testing, disable USB debugging and re-enable Samsung Auto Blocker. Revoke the PC's USB debugging authorization when the PC is no longer trusted.

## Official References

- [Run apps on a hardware device](https://developer.android.com/studio/run/device)
- [Android Debug Bridge](https://developer.android.com/tools/adb)
- [Android OEM USB drivers](https://developer.android.com/studio/run/oem-usb)
- [Samsung Auto Blocker](https://www.samsung.com/us/support/answer/ANS10003636/)
