# Project Status and Handoff

Dokumen ini adalah snapshot kanonis progres implementasi, bukan pengganti aturan di
`domain-rules.md`, `security-and-retention.md`, atau rencana di `roadmap.md`. Perbarui
tanggal, status, bukti uji, risiko, dan langkah berikutnya pada PR yang mengubah milestone
produk. Jangan mengandalkan riwayat percakapan sebagai sumber status proyek.

## Snapshot

- Tanggal: 3 September 2026
- Baseline `main`: `1ad29f1` (`fix(mobile): stabilize physical emulator routing (#7)`)
- Pekerjaan aktif: `feat/brand-system` (belum dipush atau dibuatkan PR)
- Tahap produk: fondasi development serta autentikasi/profil development; belum siap produksi
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

| Area            | Kondisi saat ini                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository      | Monorepo pnpm, Flutter, React, Functions, contracts, Firebase rules, CI, governance, dan script Windows berbasis drive D tersedia.                   |
| Mobile          | Shell Android/iOS, Riverpod, login email/password khusus emulator, pemulihan sesi, logout, dan gate profil karyawan tersedia.                        |
| Backend         | Health endpoint dan provisioning profil melalui callable Function tersedia; Employee ID `KP-000001` dibuat berurutan dan audit provisioning dicatat. |
| Firebase lokal  | Auth, Firestore, Functions, seeder tiga role, dan integration test profil tersedia. Build contracts dijalankan sebelum Functions.                    |
| Perangkat fisik | Login dan pembacaan profil berhasil pada Samsung SM-M156B melalui `adb reverse`; Auth/Firestore memakai `127.0.0.1`.                                 |
| Admin           | Shell responsif dan komponen shadcn/ui tersedia, tetapi KPI/tabel masih data kosong dan belum terhubung ke backend.                                  |
| Kualitas        | Pada PR #7: Prettier, lint/typecheck/test/build pnpm, Dart format, `flutter analyze`, 16 Flutter tests, dan simulasi login perangkat fisik lulus.    |

PR #7 telah di-squash merge pada 3 September 2026. Branch aktif menambahkan source logo
kanonis, login mobile berlogo, dan design token bersama untuk mobile/admin. Prettier, seluruh
check/build pnpm, `flutter analyze`, 18 test Flutter, serta APK debug telah lulus secara lokal;
visual smoke test halaman login pada Samsung SM-M156B juga lulus. Source logo 120 x 79 px
masih menjadi risiko ketajaman yang harus diselesaikan sebelum rilis store.

## Belum Diimplementasikan

- Sign-in Google untuk Android/web, Sign in with Apple, dan konfigurasi autentikasi produksi.
- Check-in/check-out end-to-end: kamera, GPS, klasifikasi geofence, Function command,
  penyimpanan event immutable, selfie Storage, serta idempotensi.
- Antrean offline terenkripsi 12 jam dan sinkronisasi konflik.
- Pencegahan kecurangan: App Check, Play Integrity/App Attest, deteksi developer options,
  mock location, root/jailbreak signal, rate limit, dan observability.
- Persetujuan terlambat/pulang awal, lembur, koreksi, izin, sakit, cuti, dan kalender libur.
- Dashboard operasional, pengelolaan karyawan, audit, ekspor, notifikasi push, backup data,
  retention job, serta siklus nonaktif/hapus akun.
- Build dan pengujian iOS nyata, Codemagic signing, TestFlight, Play internal testing, dan
  kesiapan store. Project iOS tersedia, tetapi Windows tidak dapat menggantikan validasi macOS.

## Urutan Pengembangan Berikutnya

1. Bangun attendance vertical slice paling kecil: office config, izin kamera/lokasi, selfie,
   GPS, check-in/out command, Functions, Rules, Storage, dan satu tabel monitoring admin.
2. Tambahkan integration test emulator untuk authorization, urutan event, idempotensi,
   geofence kantor/lapangan, serta penolakan write langsung dari client.
3. Terapkan offline queue terenkripsi dan skenario jaringan nyata tanpa menggandakan event.
4. Aktifkan login provider dan App Check development, lalu validasi Play Integrity pada build
   internal sebelum enforcement.
5. Implementasikan approval, lembur, koreksi, izin/sakit/cuti, kalender, dan cross-approval.
6. Lengkapi laporan, audit, notifikasi, retention, backup, observability, aksesibilitas,
   performa, serta hardening Android/iOS sebelum pilot terbatas.

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
