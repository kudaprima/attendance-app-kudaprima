# Development Guide

## Prasyarat

Gunakan Flutter 3.47.2 melalui junction **D:\FlutterSDK**, Dart 3.13, Node.js 22, pnpm 10.33.2, dan Java 21. Junction tersebut menghindari bug native-assets pada path Flutter yang mengandung spasi tanpa menduplikasi SDK. Jalankan **. .\scripts\use-dev-env.ps1** pada setiap terminal agar PUB, Gradle, npm, Android user data, dan AVD memakai partisi D.

Flutter Doctor dapat menampilkan warning bahwa junction **D:\FlutterSDK** mengarah ke checkout asli di **D:\Program Files\Flutter\flutter**. Keduanya adalah SDK yang sama; gunakan script repo atau jalur eksplisit tanpa spasi untuk test/build native-assets.

## VS Code

Buka root repository, bukan hanya **apps/mobile** atau **apps/admin**. Konfigurasi bersama di **.vscode** memakai junction Flutter **D:\FlutterSDK**, mengarahkan cache terminal ke D, mengembalikan file XML ke editor teks default, dan mengecualikan dependency serta artefak build dari watcher/search.

**node_modules** juga dikecualikan dari Dart Analysis Server. Firebase CLI menyertakan template proyek Dart yang dependency-nya belum dipulihkan; template tersebut bukan source aplikasi dan tidak boleh diedit atau dijalankan dengan **dart pub get**.

Gunakan **Terminal: Run Task** untuk **Project: Bootstrap**, **Admin: Dev**, **Android: Start Emulator**, atau **Quality: All**. Gunakan konfigurasi **Flutter: Mobile** pada panel Run and Debug. Setelah perubahan konfigurasi workspace, jalankan **Developer: Reload Window** agar extension host dan terminal baru memuat environment yang benar.

Java memakai mode ringan dan Gradle auto-import dinonaktifkan untuk workspace ini karena Flutter mengelola build Android. Aktifkan mode Java standar serta import Gradle sementara hanya ketika melakukan pengembangan native Android yang memerlukan analisis semantik Java lengkap.

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
