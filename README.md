# PT Kuda Prima Attendance

Monorepo aplikasi presensi harian teknisi PT Kuda Prima. Produk terdiri dari aplikasi Flutter untuk Android/iOS, dashboard admin React dengan shadcn/ui, dan backend serverless Firebase.

## Struktur utama

- **apps/mobile** — aplikasi karyawan Flutter.
- **apps/admin** — dashboard supervisor/admin React.
- **services/functions** — Cloud Functions Gen 2 TypeScript.
- **packages/contracts** — skema data bersama untuk web dan backend.
- **firebase** — Firestore indexes/rules dan Storage rules.
- **docs** — aturan domain, arsitektur, keamanan, serta panduan setup.

## Mulai di Windows

```powershell
. .\scripts\use-dev-env.ps1
.\scripts\bootstrap.ps1
pnpm dev:admin
```

Jalankan emulator minimum Android 10 dari terminal terpisah:

```powershell
.\scripts\start-android-emulator.ps1
cd apps\mobile
flutter run
```

Firebase Project ID development adalah **kuda-prima-attandance-dev** (ejaan ini disengaja mengikuti project yang sudah dibuat). Jangan commit credential atau file konfigurasi aplikasi Firebase.

Lihat [panduan pengembangan](docs/development.md) sebelum mengubah konfigurasi lokal.
