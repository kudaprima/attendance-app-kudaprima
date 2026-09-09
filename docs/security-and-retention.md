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
- Minimal dua akun supervisor/admin diperlukan untuk cross-approval.

## Retensi

Foto selfie disimpan tiga bulan lalu dihapus oleh scheduled function, tanpa backup foto. Data presensi, approval, correction, dan audit disimpan satu tahun. Backup bulanan hanya berisi data, bukan foto.

Karyawan keluar dinonaktifkan segera. Auth/contact/profile dihapus setelah tiga bulan, sedangkan nama dan Employee ID dipertahankan pada histori presensi sampai masa retensinya berakhir.

## Rahasia

Jangan commit file environment, service account, google-services.json, GoogleService-Info.plist, signing key, atau token CI. Gunakan Firebase environment/secrets dan secret manager Codemagic. Nilai konfigurasi Firebase web bukan service-account secret, tetapi tetap dikelola melalui environment per deployment.

## Development persistence

Snapshot emulator hanya untuk data sintetis lokal dan dikecualikan dari Git. Integration
test memakai project, port dan direktori temporary terpisah. Backup emulator yang
menyertakan selfie sintetis tidak mengubah larangan backup foto produksi.
