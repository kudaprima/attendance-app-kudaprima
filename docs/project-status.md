# Project Status and Handoff

Dokumen ini adalah snapshot kanonis progres implementasi, bukan pengganti aturan di
`domain-rules.md`, `security-and-retention.md`, atau rencana di `roadmap.md`. Perbarui
tanggal, status, bukti uji, risiko, dan langkah berikutnya pada PR yang mengubah milestone
produk. Jangan mengandalkan riwayat percakapan sebagai sumber status proyek.

## Snapshot

- Tanggal: 16 September 2026
- Baseline `main` terakhir yang diverifikasi: `bcb18e4` (`Feat/mobile navigation and services (#10)`). Pengembangan aktif berada di branch `feat/reliable-attendance-and-persistent-dev` untuk PR #11.
- Pekerjaan aktif: persetujuan presensi anomali (terlambat, pulang awal, luar hari kerja, dan catatan lapangan) melalui callable `processAttendanceApproval` dan portal admin, pengamanan autentikasi admin (khusus email/kata sandi internal), peningkatan form login dan alur cuti berbasis masa kerja pada mobile, serta pencarian instan multi-kolom pada master karyawan.
- Tahap produk: presensi online masuk/keluar memakai transaksi idempotent, evaluasi jadwal & geofence anomali ber-alasan terstruktur, persetujuan admin dengan penegakan strict cross-approval (anti self-approval), serta audit log immutable. Portal admin menyediakan autentikasi terisolasi email/password, master karyawan Firestore/Auth dengan pencarian multi-kolom (Nama, ID, Email, Jabatan), dan Approval Center untuk presensi anomali. Mobile menyediakan login Email/Kata Sandi dengan UI rounded/soft-fill, dialog layanan cuti berbasis masa kerja (tenure >= 1 tahun berhak 12 hari), catatan lapangan, dan kamera selfie fullscreen.
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

| Area            | Kondisi saat ini                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository      | Monorepo pnpm, Flutter, React, Functions, contracts, Firebase rules, CI, governance, brand check gate, dan script Windows berbasis drive D tersedia.                                                                                                                                                                                                                                                                                                                                                                                         |
| Mobile          | Shell Android 4-tab (`Kehadiran`, `Layanan`, `Riwayat`, `Profil`), login Email/Kata Sandi rounded soft-fill, evaluasi lokasi, Absen Masuk/Keluar, Catatan lapangan, selfie fullscreen, upload Storage, retry command idempotent, dan riwayat Firestore. Detail Presensi interaktif via modal bottom sheet menampilkan verifikasi foto selfie, peta OpenStreetMap (OSM) tanpa biaya billing dengan marker pin & radius kantor, tombol intent Google Maps eksternal, dan dual-bucket storage fallback. Quality gates: `dart format` bersih, `flutter analyze` 0 issues, dan 45/45 unit/widget tests lulus.                                                          |
| Admin Web       | Login khusus internal Email/Kata Sandi, fail-closed RBAC manajer, dashboard presensi WIB hari ini dengan navbar role fallback cerdas ("Masuk sebagai Administrator Sistem"), Approval Center presensi anomali dengan tab kategori & konfirmasi persetujuan (strict cross-approval), Master Karyawan dengan pencarian instan multi-kolom, dan dialog Detail Presensi responsif dengan foto selfie, peta Leaflet OSM, serta dual-bucket resilience. Quality gates: 34/34 unit tests lulus.                                                                                                                                               |
| Backend & Rules | Callable `processAttendanceApproval` dengan verifikasi admin aktif, anti self-approval, dan pencatatan `auditLogs/`. `submitAttendance` dengan tagging presensi anomali (`requiresApproval: true`, `approvalReasons`), event ID deterministik, transaksi event-audit-daily-state, replay idempotent, batas umur 12 jam, geofence server, validasi JPEG, dan cleanup upload. Callable employee management dengan penanganan kegagalan parsial. Quality gates: 23/23 unit tests lulus. Emulator development persisten terpisah dari suite tes. |
| Contracts       | Zod schemas untuk perintah presensi, approval presensi, tambah/edit/hapus karyawan, pengajuan cuti/lembur, dan pembaruan kontak, beserta inferred TypeScript types dan 23/23 unit tests lulus.                                                                                                                                                                                                                                                                                                                                               |
| Kualitas        | Pada 07 Oktober 2026: `pnpm check:brand` 100% lulus (logo mobile & kanonis identik), `pnpm check` lulus (80/80 unit tests monorepo: 23 contracts, 23 functions, 34 admin; oxlint 0 error/warning; typecheck bersih), `pnpm build` lulus. Mobile quality gate lulus: `flutter analyze` 0 issues, dan `flutter test` 45/45 lulus. Total seluruh monorepo: 125/125 tes lulus. Simulasi manual E2E Android & Web Admin diverifikasi tuntas oleh pengguna.                                                                                                                                     |

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
- Otomasi Cloud Functions untuk proses persetujuan (mutasi saldo cuti di Firestore saat permohonan cuti disetujui).
- Persistence backend untuk form cuti, sakit, izin, lembur; laporan/CSV; dan Approval Center yang saat ini masih demonstrasi UI.
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
