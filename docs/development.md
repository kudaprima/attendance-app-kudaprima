# Development Guide

## Prasyarat

Gunakan Flutter 3.47.2 melalui junction **D:\FlutterSDK**, Dart 3.13, Node.js 22, pnpm 10.33.2, dan Java 21. Junction tersebut menghindari bug native-assets pada path Flutter yang mengandung spasi tanpa menduplikasi SDK. Jalankan **. .\scripts\use-dev-env.ps1** pada setiap terminal agar PUB, Gradle, npm, Android user data, dan AVD memakai partisi D.

Flutter Doctor dapat menampilkan warning bahwa junction **D:\FlutterSDK** mengarah ke checkout asli di **D:\Program Files\Flutter\flutter**. Keduanya adalah SDK yang sama; gunakan script repo atau jalur eksplisit tanpa spasi untuk test/build native-assets.

## Perintah rutin

```powershell
pnpm install --frozen-lockfile
pnpm dev:admin
pnpm emulators
pnpm check
pnpm build
```

Untuk Flutter:

```powershell
cd apps\mobile
flutter analyze
flutter test
flutter run
```

Firebase CLI dipasang lokal; gunakan **pnpm firebase -- &lt;command&gt;** dari root. FlutterFire CLI berada di **D:\Development\Caches\dart-pub\bin**.
Binary Firebase Emulator Suite disimpan di **D:\Development\Caches\firebase-emulators**.

## Firebase development

Setelah login interaktif, jalankan:

```powershell
pnpm firebase login
. .\scripts\use-dev-env.ps1
flutterfire configure --project=kuda-prima-attandance-dev --platforms=android,ios
```

Periksa diff sebelum commit karena perintah kedua menghasilkan konfigurasi aplikasi. Tidak ada deploy otomatis dari mesin lokal.

## Quality gate

Perubahan harus lulus format, lint, typecheck, unit test, dan build yang relevan. Uji aturan domain terpisah dari widget/UI. Untuk fungsi yang menyentuh Firestore, tambahkan test terhadap Firebase Emulator Suite.
