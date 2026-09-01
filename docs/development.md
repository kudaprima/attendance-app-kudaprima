# Development Guide

## Prasyarat

Gunakan Flutter 3.47.2 melalui junction **D:\FlutterSDK**, Dart 3.13, Node.js 22, pnpm 10.33.2, dan Java 21. Junction tersebut menghindari bug native-assets pada path Flutter yang mengandung spasi tanpa menduplikasi SDK. Jalankan **. .\scripts\use-dev-env.ps1** pada setiap terminal agar PUB, Gradle, npm, Android user data, dan AVD memakai partisi D.

Flutter Doctor dapat menampilkan warning bahwa junction **D:\FlutterSDK** mengarah ke checkout asli di **D:\Program Files\Flutter\flutter**. Keduanya adalah SDK yang sama; gunakan script repo atau jalur eksplisit tanpa spasi untuk test/build native-assets.

## VS Code

Buka root repository, bukan hanya **apps/mobile** atau **apps/admin**. Konfigurasi bersama di **.vscode** memakai junction Flutter **D:\FlutterSDK**, mengarahkan cache terminal ke D, mengembalikan file XML ke editor teks default, dan mengecualikan dependency serta artefak build dari watcher/search.

**node_modules** juga dikecualikan dari Dart Analysis Server. Firebase CLI menyertakan template proyek Dart yang dependency-nya belum dipulihkan; template tersebut bukan source aplikasi dan tidak boleh diedit atau dijalankan dengan **dart pub get**.

Gunakan **Terminal: Run Task** untuk **Project: Bootstrap**, **Admin: Dev**, **Android: Start Emulator**, atau **Quality: All**. Gunakan konfigurasi **Flutter: Mobile (Auth Emulator)** pada panel Run and Debug. Setelah perubahan konfigurasi workspace, jalankan **Developer: Reload Window** agar extension host dan terminal baru memuat environment yang benar.

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

File **apps/mobile/firebase.json**, **firebase_options.dart**, **google-services.json**, dan **GoogleService-Info.plist** adalah konfigurasi generated lokal yang tidak di-commit. Android memakai konfigurasi native **google-services.json**; Firebase diinisialisasi tanpa menyalin identifier project ke source tracked.

Jalankan Auth Emulator dari root, lalu mobile dengan flag eksplisit berikut:

```powershell
pnpm emulators:auth
cd apps\mobile
flutter run --dart-define=USE_FIREBASE_EMULATORS=true
```

Android Emulator mengakses host melalui **10.0.2.2:9099**. iOS simulator dan host desktop memakai **127.0.0.1:9099**. Release build menolak flag emulator, dan cleartext HTTP hanya diizinkan oleh manifest Android debug.

Gunakan **pnpm emulators** hanya ketika Functions, Firestore, Hosting, dan Storage juga diperlukan. Untuk tahap autentikasi, **pnpm emulators:auth** memperkecil penggunaan resource dan mencegah service yang belum diemulasikan ikut dipanggil oleh Functions.

### Akun autentikasi development

Setelah Auth Emulator siap, buka terminal baru dari root repository dan jalankan seeder idempotent:

```powershell
. .\scripts\use-dev-env.ps1
pnpm emulators:auth:seed
```

Seeder hanya terhubung ke **127.0.0.1:9099** dan membuat atau memperbarui akun berikut:

| Peran      | Email                             |
| ---------- | --------------------------------- |
| Teknisi    | **technician.dev@kudaprima.test** |
| Supervisor | **supervisor.dev@kudaprima.test** |
| Admin      | **admin.dev@kudaprima.test**      |

Kata sandi fixture ketiganya adalah **KudaPrimaDev2026#**. Kredensial ini bukan rahasia dan tidak boleh digunakan pada Firebase online. Role berasal dari custom claim token yang dibuat Admin SDK, bukan dari pilihan pada aplikasi. Jalankan ulang seeder setiap kali Auth Emulator dimulai ulang karena data emulator bersifat sementara.

Kemudian jalankan aplikasi dengan **Flutter: Mobile (Auth Emulator)** atau:

```powershell
cd apps\mobile
flutter run --dart-define=USE_FIREBASE_EMULATORS=true
```

Uji login, pemulihan sesi setelah aplikasi dibuka ulang, pergantian ketiga role melalui logout/login, kata sandi salah, dan logout. Auth Emulator UI pada **http://127.0.0.1:4000/auth** harus menampilkan tiga akun. Akun ini belum memiliki dokumen profil Firestore; profile completion ditambahkan pada vertical slice berikutnya.

## Quality gate

Perubahan harus lulus format, lint, typecheck, unit test, dan build yang relevan. Uji aturan domain terpisah dari widget/UI. Untuk fungsi yang menyentuh Firestore, tambahkan test terhadap Firebase Emulator Suite.
