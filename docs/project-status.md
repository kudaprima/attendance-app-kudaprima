# Project Status and Handoff

Dokumen ini adalah snapshot kanonis progres implementasi, bukan pengganti aturan di
`domain-rules.md`, `security-and-retention.md`, atau rencana di `roadmap.md`. Perbarui
tanggal, status, bukti uji, risiko, dan langkah berikutnya pada PR yang mengubah milestone
produk. Jangan mengandalkan riwayat percakapan sebagai sumber status proyek.

## Snapshot

- Tanggal: 15 Oktober 2026
- Baseline `main` terakhir yang diverifikasi: `36be42f` (`Feat/reliable attendance and persistent dev (#12)`). Pengembangan aktif berada di branch `feat/workforce-service-workflows`.
- Pekerjaan aktif: implementasi alur Lupa Kata Sandi Hibrida Universal (sistem bawaan Firebase Auth, pengiriman email ke seluruh domain, dialog pesan universal singkat/jelas, klausul bantuan Administrator HR untuk domain internal), penyelarasan notice reset di Web Admin (`LoginPage.tsx`), serta perilisan Android APK Build 3 (`1.0.0+3`, `kudaprima-attendance-v3.apk`) yang telah di-deploy ke Firebase Hosting.
- Tahap produk: presensi online masuk/keluar memakai transaksi idempotent, evaluasi jadwal & geofence anomali ber-alasan terstruktur, persetujuan admin untuk presensi anomali maupun layanan ketidakhadiran/lembur dengan penegakan strict cross-approval (anti self-approval), serta audit log immutable. Portal admin menyediakan autentikasi terisolasi email/password, master karyawan Firestore/Auth dengan pencarian multi-kolom (Nama, ID, Email, Jabatan), dan Approval Center lengkap dengan dialog detail verifikasi (peta OSM, foto selfie presensi/lembur, dan lampiran surat dokter/SPK). Mobile menyediakan login Email/Kata Sandi dengan UI rounded/soft-fill, alur lupa kata sandi universal, _Glassmorphic Bottom Sheet_ untuk pengajuan Cuti Tahunan (rentang tanggal dengan eksklusi otomatis Sabtu/Minggu dan pemotongan kuota 12 hari saat disetujui Admin), Izin Sakit, Izin Khusus, dan Lembur (mendukung lintas tengah malam H+1, peringatan durasi >8 jam, dan wajib foto selfie kehadiran), catatan lapangan, serta kamera selfie fullscreen.
- Firebase development: `kuda-prima-attandance-dev` (ejaan teknis disengaja)

## Ruang Lingkup yang Disepakati

Produk melayani sekitar 60 karyawan dalam satu kantor dengan teknisi yang dapat bekerja di
lokasi pelanggan. Role akses teknis adalah teknisi dan admin, dengan jabatan fungsional (`jobTitle`). Hari kerja Senin-Jumat pukul
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

| Area            | Kondisi saat ini                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository      | Monorepo pnpm, Flutter, React, Functions, contracts, Firebase rules, CI, governance, brand check gate, dan script Windows berbasis drive D tersedia.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Mobile          | Shell Android 4-tab (`Kehadiran`, `Layanan`, `Riwayat`, `Profil`), login Email/Kata Sandi rounded soft-fill, evaluasi lokasi, Absen Masuk/Keluar, Catatan lapangan, selfie fullscreen, upload Storage, retry command idempotent, dan riwayat Firestore. Halaman login dilengkapi badge versi `v1.0.0` (kiri atas), icon vektor Google 4-warna pada tombol Google, teks copyright resmi PT Kuda Prima (tengah bawah), serta alur Lupa Kata Sandi Universal ber-dialog Material 3. Tab `Layanan` dilengkapi kartu progres kuota cuti _Glassmorphic_, _Glassmorphic Bottom Sheet_ untuk Cuti Tahunan, Izin Sakit, Izin Khusus, dan Lembur, serta sheet detail pengajuan. Quality gates: `dart format` bersih, `flutter analyze` 0 issues, dan 52/52 unit/widget tests lulus. Rilis APK Android 64-bit Build 3 (`1.0.0+3`) terkompilasi dan tersedia di portal admin.                                   |
| Admin Web       | Login khusus internal Email/Kata Sandi dengan notice reset universal, fail-closed RBAC manajer, dashboard presensi WIB hari ini dengan navbar role fallback cerdas ("Masuk sebagai Administrator Sistem"), Approval Center dengan tab kategori (Presensi Anomali, Cuti Tahunan, Izin Sakit, Izin Khusus, Lembur), `ServiceRequestDetailDialog` dengan Lightbox foto selfie lembur & lampiran surat dokter/SPK serta aksi Setujui/Tolak (strict cross-approval), Master Karyawan dengan pencarian instan multi-kolom, halaman **Laporan Kehadiran & Layanan** real-time dengan ekspor **CSV Excel UTF-8 BOM** & **PDF 1.4 Vektor Resmi** ber-kop surat resmi, refactoring Tailwind CSS v4 Canonical Classes (`max-w-55`, `lg:w-145`), serta halaman **Distribusi APK (`DistributionPage.tsx`)** dengan **QR Code ISO/IEC 18004 permanen** yang mendistribusikan `kudaprima-attendance-v3.apk` (Build 3) secara aman tanpa blokade Spark. |
| Backend & Rules | Callable `submitServiceRequest` dan `processServiceApproval` dengan validasi masa kerja >= 1 tahun untuk cuti tahunan, kalkulasi hari kerja efektif (`calculateWorkingDays`), validasi sisa kuota cuti yang telah disetujui, validasi selfie & durasi lembur, penyimpanan foto ke Storage (`service-requests/{userId}/...`), penegakan strict cross-approval, dan pencatatan `auditLogs/`. Skrip seeding production online (`seed-production-online.ts`) diselaraskan dengan kata sandi admin `PasswordAdminKuat#2026`. Client write langsung ke `serviceRequests` dikunci (`allow write: if false`).                                                                                                                                                                                                                                                                                                     |
| Contracts       | Zod schemas untuk perintah presensi, approval presensi, tambah/edit/hapus karyawan, pengajuan layanan (`submitServiceRequestCommandSchema`), approval layanan (`processServiceApprovalCommandSchema`), dan pembaruan kontak, beserta inferred TypeScript types dan 28/28 unit tests lulus.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Kualitas        | Pada 15 Oktober 2026: `pnpm check:brand` 100% lulus, `pnpm check` lulus (contracts 28/28, functions 30/30, admin 39/39 unit tests, oxlint 0 error/warning, typecheck bersih), `pnpm build` lulus. Mobile quality gate lulus: `dart format` bersih, `flutter analyze` 0 issues, dan `flutter test` 52/52 lulus. Total seluruh monorepo: 149/149 tes lulus.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Pengelolaan Karyawan — 11 September 2026

Portal Karyawan membaca daftar Firestore dan menyediakan form tambah, edit, serta
konfirmasi hapus melalui callable Functions. Admin mengelola akun karyawan dengan aman.
Tambah mencakup nama, Gmail, kata sandi, role (admin/teknisi), jabatan (`jobTitle`),
status akun/kerja dan tanggal mulai. Edit menjaga UID, Employee ID, dan tanggal
mulai, dengan pembaruan role, jabatan, serta kata sandi baru opsional. Hapus menghilangkan
Auth/profil, sementara presensi dan audit tetap mengikuti retensi. Akun baru mendapat role yang dipilih pengelola.

Verifikasi lokal: format/lint/typecheck lulus dengan 60 tes (22 contracts, 21 admin,
17 Functions), dan `pnpm test:emulator:profile` lulus dengan 43 tes integrasi. Brand
gate masih tertahan oleh perbedaan salinan logo mobile dengan aset kanonis. Login
Google sintetis memakai UID yang sama dan mempertahankan
password; pergantian email melepas provider Google lama. Tes mencakup otorisasi,
duplikasi email, status aktif, penghapusan, konkurensi/revisi, kegagalan parsial dan
retry. Form yang diubah setelah kegagalan memakai ID permintaan baru; retry tanpa
perubahan tetap memakai ID yang sama.

Build web/Functions lulus; bundle admin sekitar 1,14 MB sebelum gzip masih memberi
peringatan ukuran. OAuth Google dan App Check online belum diuji. Pengembangan ini
tidak mencakup perubahan mobile atau deployment. Lihat bagian Employee CRUD di
runbook simulasi untuk uji manual.

### Hasil simulasi manual yang dilaporkan

Pada 10 September 2026, pengguna melaporkan hasil berikut dari simulasi manual
dengan data uji:

1. Pendaftaran akun baru melalui portal admin berhasil.
2. Akun baru berhasil digunakan untuk login. Metode login tidak dirinci dalam
   laporan ini, sehingga hasil tersebut tidak dinyatakan sebagai verifikasi Google
   OAuth online.
3. Absen Masuk dan Absen Keluar dari akun baru berhasil tersimpan.

Hasil ini memverifikasi alur tambah akun sampai pencatatan pasangan presensi pada
lingkungan simulasi yang digunakan. Edit akun, status nonaktif/aktif, penggantian
password/email, konfirmasi hapus, dan Google OAuth online masih mengandalkan tes
otomatis atau memerlukan simulasi manual terpisah sebelum dinyatakan lolos manual.

## Verifikasi Baseline Presensi — 9 September 2026

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
- Cloud Functions untuk background cleanup retensi (foto selfie tiga bulan, event presensi 1 tahun).
- Verifikasi Google OAuth dan App Check pada Firebase online yang telah dikonfigurasi; login Google sengaja tidak mengirim kredensial nyata ke Auth Emulator.
- In-app OTA self-updater via intent package manager Android ketika ada versi APK baru di Firestore `systemConfig/mobileApp`.
- Build rilis pipeline CI/CD untuk otomatisasi kompilasi APK dan deployment ke Firebase Hosting.

## Urutan Pengembangan Berikutnya

1. Terapkan offline queue terenkripsi 12 jam pada mobile app dengan local SQLite/secure storage dan pengiriman ulang ber-idempotensi saat koneksi pulih.
2. Bangun background worker atau scheduled function untuk retensi data (penghapusan selfie setelah tiga bulan dan arsip event 1 tahun).
3. Verifikasi login online/App Check, lalu siapkan script CI/CD untuk build APK bertandatangan dan publikasi link unduhan/QR nyata ke Firestore.

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
