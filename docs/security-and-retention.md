# Security and Retention

## Kontrol utama

- Firebase Auth mendukung Google serta Email/Kata Sandi dan reset kata sandi. Semua akun tetap memerlukan profil dan custom claims dari backend; login tidak memberi role otomatis.
- Android online mengaktifkan App Check: debug provider hanya pada debug build dan Play Integrity pada release. Konfigurasi outside-Google-Play wajib diverifikasi untuk APK sideloaded (ADR 0004). Auth ID token bukan pengganti App Check. iOS di luar scope aktif.
- Developer Options saja diperbolehkan. Login dan dashboard tetap dapat digunakan, tetapi semua
  aksi presensi harus diblokir ketika sampel lokasi ditandai mock. Tidak tersedia bypass pengguna;
  aksi baru boleh aktif kembali setelah perangkat memberikan sampel baru yang tidak ditandai mock.
  Android hanya menyediakan sinyal publik yang
  andal setelah sampel lokasi diterima melalui
  [`Location.isMock()`](<https://developer.android.com/reference/android/location/Location#isMock()>);
  pengaturan lama
  [`ALLOW_MOCK_LOCATION`](https://developer.android.com/reference/android/provider/Settings.Secure#ALLOW_MOCK_LOCATION)
  sudah deprecated dan tidak dapat dijadikan kontrol. Enumerasi semua aplikasi terpasang juga
  tidak boleh dijadikan jalan pintas karena menambah risiko privasi dan kebijakan store. Karena
  itu, deteksi aplikasi mock yang baru dipilih tetapi belum mengirim lokasi bersifat best-effort
  dan harus dilapis dengan App Check, Play Integrity, validasi server, timestamp, serta audit.
  Aplikasi tidak boleh mengklaim jaminan absolut terhadap perangkat root/jailbreak atau framework
  manipulasi tingkat lanjut.
- Foto hanya berasal dari kamera aplikasi; izin photo library tidak diminta.
- Offline queue maksimum 12 jam dan payload sensitif dienkripsi memakai kunci dari secure storage.
- Custom claims menentukan role; Security Rules bersifat deny-by-default.
- Minimal dua akun Admin aktif diperlukan untuk cross-approval dan penjagaan tata kelola.

## Retensi

Foto selfie disimpan tiga bulan lalu dihapus oleh scheduled function, tanpa backup foto. Data presensi, approval, correction, dan audit disimpan satu tahun. Backup bulanan hanya berisi data, bukan foto.

Karyawan keluar dinonaktifkan segera. Pada alur retensi biasa, Auth/contact/profile
dihapus setelah tiga bulan. Sebagai aksi eksplisit terpisah, admin dapat memakai
Hapus Karyawan dengan konfirmasi untuk langsung menghapus Auth/contact/profile.
Nama dan Employee ID pada histori presensi tetap dipertahankan sampai masa
retensinya berakhir; aksi ini tidak menghapus histori maupun audit.

## Keamanan pengelolaan akun

CRUD karyawan memakai callable Functions dengan App Check online serta verifikasi
akun Auth, profil, klaim admin, email sesi, dan waktu pencabutan sesi. Client tetap
dilarang menulis field perusahaan atau menghapus profil langsung melalui Firestore.
Kata sandi hanya dikirim ke Firebase Auth melalui backend; tidak disimpan pada
profil, log, audit, atau penyimpanan browser.

Pendaftaran Gmail oleh admin adalah provisioning tepercaya: pengelola memastikan alamat
utama tersebut milik karyawan. Backend menandai email hasil provisioning sebagai
terverifikasi agar login Google pertama mempertahankan provider kata sandi.
Penanda ini merupakan pernyataan pengelola, bukan bukti verifikasi email otomatis.
Saat email diubah, provider federasi lama dilepas dan refresh token dicabut; kata
sandi aplikasi tetap kecuali admin menggantinya. Satu akun per email harus aktif
pada konfigurasi Firebase Auth. Akun Google tanpa profil/role tidak mendapat akses.

Selama mutasi Auth/Firestore, profil ditahan nonaktif. Kegagalan parsial ditampilkan
sebagai proses belum selesai dan dapat diulang. Lease privat mencegah operasi yang
bertumpuk; revisi profil menolak form lama. Audit hanya berisi identitas pelaku/subjek,
aksi, waktu, serta indikator perubahan kata sandi tanpa nilainya. Lihat ADR 0005.

## Rahasia

Jangan commit file environment, service account, google-services.json, GoogleService-Info.plist, signing key, atau token CI. Gunakan Firebase environment/secrets dan secret manager Codemagic. Nilai konfigurasi Firebase web bukan service-account secret, tetapi tetap dikelola melalui environment per deployment.

## Development persistence

Snapshot emulator hanya untuk data sintetis lokal dan dikecualikan dari Git. Integration
test memakai project, port dan direktori temporary terpisah. Backup emulator yang
menyertakan selfie sintetis tidak mengubah larangan backup foto produksi.
