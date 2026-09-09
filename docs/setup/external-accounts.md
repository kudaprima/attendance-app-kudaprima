# External Accounts Checklist

The active release target is Android 10+ sideloaded APK and the React web admin.
Firebase development project ID remains `kuda-prima-attandance-dev`.

## Online login prerequisites

- Register Android `com.kudaprima.attendance` and the web admin in Firebase.
- Enable Google and Email/Password providers in Firebase Authentication.
- Register the signing certificate SHA-1/SHA-256 for the actual Android build.
- Keep generated google-services.json local; it must contain the associated OAuth web
  client. Never commit generated config or signing material.
- Configure the web authDomain and authorized domains for the deployed admin origin.
- Provision employee profiles and custom role claims through the authorized backend;
  Google sign-in alone does not grant access or create an employee profile.
- Verify password reset delivery/templates against an authorized online test account.
- Register App Check and test sideloaded Play Integrity settings. Debug provider tokens
  are only for authorized debug testing and must not be committed.

Emulator Google login intentionally does not obtain or forward real Google credentials.
Email login and password-reset OOB links are available for synthetic local simulation.

## Before distribution

Keep a consistent corporate signing key and verify package version upgrades. Implement
real QR/download metadata before distributing an APK. App stores/iOS are outside the
active plan. Deployment, billing/provider settings and production resources require
explicit approval. Never request passwords, OTPs, service-account keys or signing keys
through chat.

References: https://firebase.google.com/docs/auth/flutter/federated-auth and
https://firebase.google.com/docs/app-check/android/play-integrity-provider.
