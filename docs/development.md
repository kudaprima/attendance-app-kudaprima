# Development Guide

## Prasyarat

Gunakan Flutter 3.47.2 melalui junction **D:\FlutterSDK**, Dart 3.13, Node.js 22, pnpm 10.33.2, dan Java 21. Junction tersebut menghindari bug native-assets pada path Flutter yang mengandung spasi tanpa menduplikasi SDK. Jalankan **. .\scripts\use-dev-env.ps1** pada setiap terminal agar PUB, Gradle, npm, Android user data, dan AVD memakai partisi D.

Flutter Doctor dapat menampilkan warning bahwa junction **D:\FlutterSDK** mengarah ke checkout asli di **D:\Program Files\Flutter\flutter**. Keduanya adalah SDK yang sama; gunakan script repo atau jalur eksplisit tanpa spasi untuk test/build native-assets.

## VS Code

Buka root repository, bukan hanya **apps/mobile** atau **apps/admin**. Konfigurasi bersama di **.vscode** memakai junction Flutter **D:\FlutterSDK**, mengarahkan cache terminal ke D, mengembalikan file XML ke editor teks default, dan mengecualikan dependency serta artefak build dari watcher/search.

**node_modules** juga dikecualikan dari Dart Analysis Server. Firebase CLI menyertakan template proyek Dart yang dependency-nya belum dipulihkan; template tersebut bukan source aplikasi dan tidak boleh diedit atau dijalankan dengan **dart pub get**.

Gunakan **Terminal: Run Task** untuk **Project: Bootstrap**, **Admin: Dev**, **Android: Start Emulator**, atau **Quality: All**. Pada panel Run and Debug, pilih **Flutter: Android AVD (Firebase Emulators)** untuk emulator atau **Flutter: Physical Android (Firebase Emulators)** untuk ponsel USB yang sudah disiapkan dengan `adb reverse`. Setelah perubahan konfigurasi workspace, jalankan **Developer: Reload Window** agar extension host dan terminal baru memuat environment yang benar.

Java memakai mode ringan dan Gradle auto-import dinonaktifkan untuk workspace ini karena Flutter mengelola build Android. Aktifkan mode Java standar serta import Gradle sementara hanya ketika melakukan pengembangan native Android yang memerlukan analisis semantik Java lengkap.

## Perintah rutin

Untuk langkah terminal siap salin bagi Auth Emulator, Android AVD, dan perangkat fisik, gunakan
**docs/testing/development-runbook.md**.

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

File **apps/mobile/firebase.json**, **firebase_options.dart**, **google-services.json**, dan **GoogleService-Info.plist** adalah konfigurasi generated lokal yang tidak di-commit. Android memakai konfigurasi native **google-services.json**; Firebase diinisialisasi tanpa menyalin identifier project ke source tracked.

Jalankan profil emulator dari root, lalu mobile dengan flag eksplisit berikut untuk AVD:

```powershell
pnpm emulators:profile
cd apps\mobile
flutter run --dart-define=USE_FIREBASE_EMULATORS=true
```

Perangkat Android fisik harus menambahkan `--dart-define=FIREBASE_EMULATOR_HOST=127.0.0.1` setelah menjalankan `scripts/prepare-android-device.ps1`. Jangan memakai konfigurasi AVD pada perangkat fisik.

Android Emulator mengakses Auth melalui **10.0.2.2:9099**, Firestore melalui **10.0.2.2:8080**, dan Functions melalui **10.0.2.2:5001**. iOS simulator, host desktop, dan perangkat Android dengan `adb reverse` memakai **127.0.0.1** dengan port yang sama. Automatic Android host mapping dinonaktifkan untuk Auth dan Firestore karena host sudah dipilih secara eksplisit; jika dibiarkan aktif, Firebase Auth akan mengganti `127.0.0.1` menjadi `10.0.2.2` pada perangkat fisik. Release build menolak flag emulator, dan cleartext HTTP hanya diizinkan oleh manifest Android debug. Persistensi Firestore dinonaktifkan khusus pada mode emulator agar cache lokal tidak mencampur data antar-sesi pengujian; konfigurasi Firebase non-emulator tidak diubah.

Gunakan **pnpm emulators** hanya ketika Functions, Hosting, dan Storage juga diperlukan. **pnpm emulators:profile** adalah profil development utama untuk alur login dan profil. Kedua perintah yang memuat Functions selalu membangun shared contracts lebih dulu agar deklarasi TypeScript tidak kedaluwarsa. **pnpm emulators:auth** tetap tersedia untuk pengujian autentikasi secara terisolasi.

### Akun dan profil development

Setelah profil emulator siap, buka terminal baru dari root repository dan jalankan seeder idempotent:

```powershell
. .\scripts\use-dev-env.ps1
pnpm emulators:profile:seed
```

Seeder hanya terhubung ke Auth **127.0.0.1:9099** dan Firestore **127.0.0.1:8080**, lalu membuat atau memperbarui akun berikut:

| Peran      | Email                             |
| ---------- | --------------------------------- |
| Teknisi    | **technician.dev@kudaprima.test** |
| Supervisor | **supervisor.dev@kudaprima.test** |
| Admin      | **admin.dev@kudaprima.test**      |

Kata sandi fixture ketiganya adalah **KudaPrimaDev2026#**. Kredensial ini bukan rahasia dan tidak boleh digunakan pada Firebase online. Role berasal dari custom claim token yang dibuat Admin SDK, bukan dari pilihan pada aplikasi. Seeder juga membuat profil **users**, counter Employee ID, audit provisioning, dan konfigurasi **officeLocations/main** secara idempotent. Jalankan ulang seeder setiap kali Emulator Suite dimulai ulang karena data emulator bersifat sementara. Gunakan **pnpm emulators:auth:seed** hanya untuk test Auth yang sengaja tidak membutuhkan profil.

Kemudian jalankan aplikasi dengan konfigurasi Run yang sesuai perangkat, atau:

```powershell
cd apps\mobile
flutter run --dart-define=USE_FIREBASE_EMULATORS=true
```

Uji login, pemulihan sesi setelah aplikasi dibuka ulang, pergantian ketiga role melalui logout/login, kata sandi salah, dan logout. Emulator Suite UI pada **http://127.0.0.1:4000** harus menampilkan Auth pada port **9099**, Firestore pada port **8080**, dan Functions pada port **5001**. Firestore harus berisi tiga dokumen **users**, **systemCounters/employeeId**, serta tiga record **auditLogs**. Dashboard menampilkan Employee ID dan status kerja dari profil, bukan dari input pengguna.

### Integration test Firestore

Jika Emulator Suite tidak berjalan, gunakan wrapper yang menyalakan Firestore sementara lalu menghentikannya otomatis:

```powershell
pnpm test:emulator:profile
```

Jika **pnpm emulators:profile** sedang berjalan, jangan membuka instance kedua pada port 8080. Jalankan test langsung terhadap emulator aktif, lalu jalankan ulang seeder karena test membersihkan data sintetisnya:

```powershell
pnpm --filter @kuda-prima/functions test:emulator
pnpm emulators:profile:seed
```

## Quality gate

Perubahan harus lulus format, lint, typecheck, unit test, dan build yang relevan. Uji aturan domain terpisah dari widget/UI. Untuk fungsi yang menyentuh Firestore, tambahkan test terhadap Firebase Emulator Suite.
