# Project Status and Handoff

Dokumen ini adalah snapshot kanonis progres implementasi, bukan pengganti aturan di
`domain-rules.md`, `security-and-retention.md`, atau rencana di `roadmap.md`. Perbarui
tanggal, status, bukti uji, risiko, dan langkah berikutnya pada PR yang mengubah milestone
produk. Jangan mengandalkan riwayat percakapan sebagai sumber status proyek.

## Snapshot

- Tanggal: 8 September 2026
- Baseline `main`: `ba95d27` (`feat: vertical slice presensi (#9)`)
- Pekerjaan aktif: Sideloaded APK distribution, UI/UX mobile overhaul, & admin authentication/RBAC (`feat/mobile-navigation-and-services`)
- Tahap produk: Navigasi 4-tab mobile, hub layanan karyawan (Cuti, Izin Sakit, Lembur, Profil), perbaikan spacing layout, form login & RBAC Web Admin (pemblokiran teknisi, cross-approval enforcement, QR Code distribusi APK), optimasi modul Cloud Functions (lazy loading eliminasi timeout emulator), dan runbook simulasi terminal selesai diimplementasikan dan diverifikasi (41 Vitest tests, 31 Flutter tests, 0 lint/analyzer issues).
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

| Area            | Kondisi saat ini                                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository      | Monorepo pnpm, Flutter, React, Functions, contracts, Firebase rules, CI, governance, brand check gate, dan script Windows berbasis drive D tersedia.                                                                       |
| Mobile          | Shell Android 4-tab (`Presensi`, `Layanan`, `Riwayat`, `Profil`), perbaikan spacing layout seimbang (16dp vertical spacing), hub kuota cuti tahunan (12 hari/tahun, validasi masa kerja >= 1 thn), pengajuan izin sakit (H+3), lembur (>8 jam warning), edit kontak profil (`phone`, `homeAddress`), dialog QR Code APK, evaluasi lokasi kantor/lapangan, alur submit presensi masuk/pulang, dialog catatan lapangan, camera selfie dialog, upload Storage, dan integrasi Cloud Functions. |
| Admin Web       | Form Login resmi berlogo Kuda Prima, Role-Based Access Control (RBAC) & Gate (`technician` diblokir ke portal web), penanganan akun nonaktif, sesi token claim refresh, Pusat Persetujuan (*Approval Center*) dengan penolakan *Self-approval* (cross-approval wajib), Halaman Distribusi APK & generator QR Code vektor, Master Karyawan, dan Laporan Presensi dengan ekspor CSV. |
| Backend & Rules | Health endpoint, provisioning profil, seeder kantor/profil, Cloud Function `recordAttendanceEvent` (idempotensi, validasi geofence, validasi selfie Storage, catatan lapangan), audit event immutable, rule pembatasan write client, dan optimasi pemuatan modul lazy loading (waktu inisialisasi turun dari 47s ke 842ms, mencegah emulator discovery timeout). |
| Contracts       | Zod schemas untuk `attendanceSubmissionCommandSchema`, `leaveRequestCommandSchema`, `overtimeRequestCommandSchema`, `updateContactProfileCommandSchema`, dan inferred TypeScript types dengan unit tests lengkap.            |
| Kualitas        | `pnpm check:brand`, lint/typecheck/test/build pnpm (41 Vitest tests lulus: 17 contracts, 7 admin, 17 functions), `flutter analyze` (0 issue), dan 31 Flutter tests lulus. Panduan pengujian terminal terdokumentasi di `docs/testing/manual-simulation-runbook.md`. |

## Belum Diimplementasikan

- Antrean offline terenkripsi 12 jam pada SQLite lokal dan sinkronisasi otomatis saat koneksi pulih.
- Otomasi Cloud Functions untuk proses persetujuan (mutasi saldo cuti di Firestore saat permohonan cuti disetujui).
- Cloud Functions untuk background cleanup retensi (foto selfie 90 hari, event presensi 1 tahun).
- In-app OTA self-updater via intent package manager Android ketika ada versi APK baru di Firestore `systemConfig/mobileApp`.
- Build rilis pipeline CI/CD untuk otomatisasi kompilasi APK dan deployment ke Firebase Hosting.

## Urutan Pengembangan Berikutnya

1. Terapkan offline queue terenkripsi 12 jam pada mobile app dengan local SQLite/secure storage dan pengiriman ulang ber-idempotensi saat koneksi pulih.
2. Implementasikan Cloud Functions handler untuk persetujuan permohonan Cuti (pemotongan kuota cuti tahunan), Lembur, dan Izin Sakit.
3. Hubungkan form pengajuan cuti, izin sakit, dan lembur di mobile ke Cloud Functions / Firestore.
4. Bangun background worker atau scheduled function untuk retensi data (penghapusan selfie setelah 90 hari).
5. Siapkan script CI/CD untuk otomatisasi build APK bertandatangan dan publikasi link unduhan ke Firestore.

Setiap tahap harus memakai data sintetis di emulator, memiliki automated test pada boundary
yang berubah, dan lulus quality gate sebelum PR di-squash. Kelayakan end user baru dapat
dinyatakan setelah alur inti, kegagalan jaringan, keamanan perangkat, akses admin, retensi,
dan build store diuji pada perangkat nyata.

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
