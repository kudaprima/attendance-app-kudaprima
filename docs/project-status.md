# Project Status and Handoff

Dokumen ini adalah snapshot kanonis progres implementasi, bukan pengganti aturan di
`domain-rules.md`, `security-and-retention.md`, atau rencana di `roadmap.md`. Perbarui
tanggal, status, bukti uji, risiko, dan langkah berikutnya pada PR yang mengubah milestone
produk. Jangan mengandalkan riwayat percakapan sebagai sumber status proyek.

## Snapshot

- Tanggal: 9 September 2026
- Baseline `main`: `bcb18e4` (`Feat/mobile navigation and services (#10)`)
- Pekerjaan aktif: penguatan presensi online, login standar, riwayat nyata, UI mobile, dan lingkungan development persisten (`feat/reliable-attendance-and-persistent-dev`)
- Tahap produk: presensi online masuk/keluar sudah memakai transaksi idempotent, validasi urutan/waktu/selfie, audit immutable, serta riwayat Firestore. Mobile menyediakan login Email/Kata Sandi, reset kata sandi, Google OAuth untuk Firebase online, UI Kehadiran, Catatan lapangan, dan kamera selfie fullscreen. Emulator development memulihkan akun, profil, riwayat, dan foto tanpa seed manual. Diverifikasi dengan 44 unit/component Vitest tests, 25 Emulator Suite integration tests, 36 Flutter tests, analyzer/lint/typecheck tanpa issue, build web/Functions, dan APK debug.
- Firebase development: `kuda-prima-attandance-dev` (ejaan teknis disengaja)

## Ruang Lingkup yang Disepakati

Produk melayani sekitar 60 karyawan dalam satu kantor dengan teknisi yang dapat bekerja di
lokasi pelanggan. Role adalah teknisi, supervisor, dan admin. Hari kerja Senin-Jumat pukul
08.00-17.00 WIB mengikuti kalender Indonesia, tanpa shift. Presensi inti terdiri dari masuk
dan pulang; lembur dimulai setelah pulang dan memerlukan persetujuan.

Distribusi aplikasi mobile dipusatkan sebagai **Sideloaded Android APK via QR Code** yang diunduh
dari portal admin (tanpa Google Play Store maupun Apple App Store) untuk rilis cepat dan privasi internal.
Geofence kantor maksimal 100 meter. Presensi lapangan tetap sah tanpa lokasi pelanggan yang
didaftarkan, tetapi wajib catatan. Presensi memakai GPS satu kali dan selfie kamera langsung;
tidak ada pelacakan 24 jam, galeri, MDM, atau face-liveness. Aplikasi menargetkan Android 10+ (API 29+).
Admin web memakai React dan shadcn/ui.

Palet visual memakai `#F7FAFC` 40%, `#F25923` 30%, `#283989` 20%, dan `#504074`
10% sebagai pedoman bobot visual. Token semantik serta aksesibilitas lebih penting daripada
penerapan persentase secara literal.

Data presensi dan audit disimpan satu tahun, foto tiga bulan tanpa backup foto. Backup bulanan
hanya memuat data. Event presensi asli immutable, waktu disimpan UTC dan ditampilkan WIB,
serta self-approval dilarang.

## Progres Terverifikasi

| Area            | Kondisi saat ini                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository      | Monorepo pnpm, Flutter, React, Functions, contracts, Firebase rules, CI, governance, brand check gate, dan script Windows berbasis drive D tersedia.                                                                                                                                                                                                                                                     |
| Mobile          | Shell Android 4-tab (`Kehadiran`, `Layanan`, `Riwayat`, `Profil`), login Email/Kata Sandi, reset kata sandi, Google OAuth online, evaluasi lokasi, Absen Masuk/Keluar, Catatan lapangan, selfie fullscreen, upload Storage, retry command idempotent dalam sesi, dan riwayat nyata dari Firestore. Form cuti/sakit/izin/lembur dan QR masih UI prototipe tanpa persistence/unduhan nyata.                |
| Admin Web       | Login Email/Kata Sandi, Google OAuth online, reset kata sandi, fail-closed RBAC untuk akun manajer, dan dashboard presensi hari ini berdasarkan batas tanggal WIB tersedia. Approval Center, Master Karyawan, laporan CSV, dan QR distribusi masih memakai data/aksi demonstrasi dan belum menjadi alur backend operasional.                                                                             |
| Backend & Rules | Health/provisioning, `submitAttendance` dengan event ID deterministik, transaksi event-audit-daily-state, replay idempotent, urutan harian, batas umur 12 jam, toleransi waktu masa depan lima menit, geofence server, validasi struktur JPEG, cleanup upload tak terpakai, serta pembatasan akun aktif/role. Emulator development persisten terpisah dari integration test.                             |
| Contracts       | Zod schemas untuk `attendanceCommandSchema`, `leaveRequestCommandSchema`, `overtimeRequestCommandSchema`, `updateContactProfileCommandSchema`, dan inferred TypeScript types dengan unit tests lengkap.                                                                                                                                                                                                  |
| Kualitas        | Pada 9 September 2026: `pnpm check` lulus (17 contracts, 10 admin, 17 Functions), 25 Emulator Suite integration tests lulus, `flutter analyze` tanpa issue, 36 Flutter tests lulus, `pnpm build` lulus, dan APK debug emulator berhasil dibangun. Uji manual tersedia di `docs/testing/manual-simulation-runbook.md`; Google OAuth/App Check online dan kamera/GPS fisik belum dinyatakan terverifikasi. |

## Verifikasi Ulang untuk PR

Pada 9 September 2026, dependency mobile dipulihkan dengan `flutter pub get` dan
dependency JavaScript dengan `pnpm install --frozen-lockfile`. Format Prettier/Dart,
brand gate, lint/typecheck, 44 tes Vitest, 25 tes integrasi emulator terisolasi, 36 tes
Flutter, dan build web/Functions lulus. Peringatan bundle admin sekitar 926 KB
sebelum gzip masih ada; pemisahan bundle dapat dioptimalkan terpisah.
Build `flutter build apk --debug --dart-define=USE_FIREBASE_EMULATORS=true` juga
lulus. Toolchain masih memberi peringatan migrasi Kotlin plugin dan versi SDK XML;
artefak ini APK debug untuk emulator, bukan APK rilis bertandatangan perusahaan.

`adb devices -l` tidak menemukan perangkat pada sesi ini. Screenshot UI dan smoke
test fisik kamera/GPS belum tersedia, sehingga PR tetap draft sampai bukti manual
tersebut dilengkapi. Pemulihan data lintas restart dan Google OAuth/App Check online
tetap memerlukan uji manual sesuai runbook; kelulusan tes otomatis tidak menggantikan
penerimaan perangkat nyata.

## Belum Diimplementasikan

- Antrean offline terenkripsi 12 jam pada SQLite lokal dan sinkronisasi otomatis saat koneksi pulih.
- Otomasi Cloud Functions untuk proses persetujuan (mutasi saldo cuti di Firestore saat permohonan cuti disetujui).
- Persistence backend untuk form cuti, sakit, izin, lembur; Master Karyawan; laporan/CSV; dan Approval Center yang saat ini masih demonstrasi UI.
- Cloud Functions untuk background cleanup retensi (foto selfie tiga bulan, event presensi 1 tahun).
- Verifikasi Google OAuth dan App Check pada Firebase online yang telah dikonfigurasi; login Google sengaja tidak mengirim kredensial nyata ke Auth Emulator.
- In-app OTA self-updater via intent package manager Android ketika ada versi APK baru di Firestore `systemConfig/mobileApp`.
- Build rilis pipeline CI/CD untuk otomatisasi kompilasi APK dan deployment ke Firebase Hosting.

## Urutan Pengembangan Berikutnya

1. Terapkan offline queue terenkripsi 12 jam pada mobile app dengan local SQLite/secure storage dan pengiriman ulang ber-idempotensi saat koneksi pulih.
2. Implementasikan Cloud Functions handler untuk persetujuan permohonan Cuti (pemotongan kuota cuti tahunan), Lembur, dan Izin Sakit.
3. Hubungkan form pengajuan cuti, izin sakit, dan lembur di mobile ke Cloud Functions / Firestore.
4. Bangun background worker atau scheduled function untuk retensi data (penghapusan selfie setelah tiga bulan).
5. Verifikasi login online/App Check, lalu siapkan script CI/CD untuk build APK bertandatangan dan publikasi link unduhan/QR nyata ke Firestore.

Setiap tahap harus memakai data sintetis di emulator, memiliki automated test pada boundary
yang berubah, dan lulus quality gate sebelum PR di-squash. Kelayakan end user baru dapat
dinyatakan setelah alur inti, kegagalan jaringan, keamanan perangkat, akses admin, retensi,
dan build APK bertandatangan diuji pada perangkat nyata.

## Perubahan Konsep dan Handoff

Fitur, alur, dan tampilan boleh disesuaikan tanpa mengurangi fungsi inti dengan proses berikut:

1. Tulis perubahan kebutuhan dan acceptance criteria; tandai aturan domain/security terdampak.
2. Ubah contracts dan test lebih dahulu jika payload atau state berubah.
3. Pertahankan batas mobile/admin -> Functions -> Firestore dan event immutable.
4. Migrasikan data secara eksplisit; jangan mengubah arti field tersimpan secara diam-diam.
5. Uji regresi alur lama, akses role, offline, dan perangkat nyata sebelum menghapus UI lama.
6. Perbarui dokumen keputusan, roadmap, dan snapshot ini pada PR yang sama.

Saat melanjutkan pekerjaan, baca berurutan: `AGENTS.md`, dokumen ini, `architecture.md`,
`domain-rules.md`, `security-and-retention.md`, lalu dokumen fitur terkait. Verifikasi status
aktual dengan `git status`, riwayat `main`, dan test; snapshot ini dapat tertinggal jika PR
terbaru belum memperbaruinya.
