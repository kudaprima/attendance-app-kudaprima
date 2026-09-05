# Project Status and Handoff

Dokumen ini adalah snapshot kanonis progres implementasi, bukan pengganti aturan di
`domain-rules.md`, `security-and-retention.md`, atau rencana di `roadmap.md`. Perbarui
tanggal, status, bukti uji, risiko, dan langkah berikutnya pada PR yang mengubah milestone
produk. Jangan mengandalkan riwayat percakapan sebagai sumber status proyek.

## Snapshot

- Tanggal: 5 September 2026
- Baseline `main`: `7e21ede` (`feat: apply shared brand system (#8)`)
- Pekerjaan aktif: vertical slice presensi (`feat/attendance-submission-slice`)
- Tahap produk: implementasi vertical slice presensi selesai dan terverifikasi end-to-end (kamera langsung, GPS satu kali, catatan lapangan, Cloud Functions, Storage selfie, Firestore immutable events, rules penolakan write client, realtime live monitoring admin)
- Firebase development: `kuda-prima-attandance-dev` (ejaan teknis disengaja)

## Ruang Lingkup yang Disepakati

Produk melayani sekitar 60 karyawan dalam satu kantor dengan teknisi yang dapat bekerja di
lokasi pelanggan. Role adalah teknisi, supervisor, dan admin. Hari kerja Senin-Jumat pukul
08.00-17.00 WIB mengikuti kalender Indonesia, tanpa shift. Presensi inti terdiri dari masuk
dan pulang; lembur dimulai setelah pulang dan memerlukan persetujuan.

Geofence kantor maksimal 100 meter. Presensi lapangan tetap sah tanpa lokasi pelanggan yang
didaftarkan, tetapi wajib catatan. Presensi memakai GPS satu kali dan selfie kamera langsung;
tidak ada pelacakan 24 jam, galeri, MDM, atau face-liveness. Aplikasi menargetkan Android 10+
dan iOS yang masih mendukung iPhone X. Admin web memakai React dan shadcn/ui.

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
| Mobile          | Shell Android/iOS, Riverpod, login berlogo, gate profil, evaluasi lokasi kantor/lapangan, alur submit presensi masuk/pulang, dialog catatan lapangan, camera selfie dialog, upload Storage, dan integrasi Cloud Functions. |
| Backend         | Health endpoint, provisioning profil, seeder kantor/profil, Cloud Function `recordAttendanceEvent` (idempotensi, validasi geofence, validasi selfie Storage, catatan lapangan), dan audit event immutable.                 |
| Firebase lokal  | Auth, Firestore, Functions, Storage emulator (`pnpm emulators:profile`), seeder 3 role + kantor, 16 test emulator Firestore/rules lulus (termasuk penolakan client write pada `attendanceEvents`), policy unit test lulus. |
| Perangkat & AVD | Smoke check visual pada Samsung SM-M156B (`adb reverse`); simulasi interaktif end-to-end berhasil pada Android AVD API 29 (`KudaPrima_API_29`) mencatat presensi masuk lapangan dengan foto selfie dan catatan teknisi.    |
| Admin           | Shell responsif, brand tokens Tailwind, shadcn/ui, hook realtime `useAttendanceLive`, dan tabel live monitoring event presensi (nama, role, tipe, geofence, catatan, timestamp WIB).                                       |
| Kualitas        | `pnpm check:brand`, lint/typecheck/test/build pnpm (31 Vitest tests lulus), `flutter analyze` (0 issue), dan 31 Flutter tests lulus.                                                                                       |

Milestone vertical slice presensi (`feat/attendance-submission-slice`) mengimplementasikan alur lengkap pengajuan presensi:

1. Validasi kontrak Zod pada package `@kuda-prima/contracts` (`AttendanceSubmissionCommandSchema`, status: `normal`, `late`, `early_departure`, `non_working_day`).
2. Cloud Function `recordAttendanceEvent` dengan verifikasi token pengguna, validasi jarak kantor vs lapangan, kewajiban catatan lapangan jika di luar radius 100m kantor, verifikasi keberadaan selfie di Firebase Storage, pembuatan dokumen immutable di `attendanceEvents`, dan evaluasi jadwal operasional (WIB/hari kerja vs akhir pekan).
3. Firestore security rules yang secara tegas menolak penulisan langsung dari client (`allow create, update, delete: if false;`) dan mengizinkan pembacaan hanya untuk pemilik data atau manajer/admin.
4. Mobile UI & State: `AttendanceSubmissionRepository`, Riverpod providers, modal catatan lapangan mandiri, dialog kamera viewfinder langsung (`camera: ^0.11.0+2`), serta evaluasi status presensi adaptif ("Tepat Waktu", "Terlambat", "Pulang Awal", dan "Luar Hari Kerja" pada akhir pekan/di luar jam operasional).
5. Admin Web Portal: Integrasi Firebase Auth dev mode (`admin.dev@kudaprima.test`), realtime Firestore listener via `useAttendanceLive`, menampilkan tabel presensi karyawan terkini dengan badge geofence, status kehadiran ("Tepat Waktu", "Terlambat", "Pulang Awal", "Luar Hari Kerja"), dan format waktu WIB.
6. Verifikasi Simulasi Manual Pengguna: Pengguna telah berhasil melakukan simulasi manual, presensi tercatat di Firestore, foto selfie tersimpan di Storage emulator, webcam laptop (`webcam0`) aktif di AVD, dan perbaikan klasifikasi akhir pekan serta otentikasi admin telah tervalidasi.

## Belum Diimplementasikan

- Catatan perbaikan lanjutan dari evaluasi pengguna untuk tahapan pengembangan berikutnya.
- Sign-in Google untuk Android/web, Sign in with Apple, dan konfigurasi autentikasi produksi.
- Antrean offline terenkripsi 12 jam dan sinkronisasi konflik dengan idempotensi.
- Pencegahan kecurangan lanjutan: App Check production provider, Play Integrity/App Attest, deteksi developer options, mock location hardening pada OS level, root/jailbreak signal, rate limit, dan observability.
- Persetujuan terlambat/pulang awal, lembur, koreksi, izin, sakit, cuti, dan kalender libur.
- Dashboard operasional analitik, pengelolaan master karyawan, ekspor laporan, notifikasi push, backup data otomatis, retention cleanup job 90 hari / 1 tahun.
- Build dan pengujian iOS nyata, Codemagic signing, TestFlight, Play internal testing, dan kesiapan store.

## Urutan Pengembangan Berikutnya

1. Mengakomodasi detail catatan perbaikan dari pengguna pada sesi berikutnya sebelum melangkah ke fitur baru.
2. Terapkan offline queue terenkripsi 12 jam pada mobile app dengan local SQLite/secure storage dan pengiriman ulang ber-idempotensi saat koneksi pulih.
3. Implementasikan alur presensi pulang (check-out) dan validasi urutan harian (tidak boleh check-out sebelum check-in).
4. Implementasikan approval supervisor untuk presensi dengan catatan lapangan, keterlambatan, presensi luar hari kerja, atau permohonan lembur.
5. Aktifkan App Check production provider & integrasi Play Integrity pada internal testing build.
6. Lengkapi portal admin untuk filter tanggal, pencarian karyawan, dan ekspor data presensi ke CSV/Excel.

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
