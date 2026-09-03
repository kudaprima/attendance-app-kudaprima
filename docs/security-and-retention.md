# Security and Retention

## Kontrol utama

- Firebase Auth memakai Google; Sign in with Apple ditambahkan untuk iOS.
- App Check memakai Play Integrity pada Android serta App Attest/DeviceCheck pada iOS.
- Developer Options saja diperbolehkan. Login dan dashboard tetap dapat digunakan, tetapi semua
  aksi presensi harus diblokir ketika sampel lokasi ditandai mock. Tidak tersedia bypass pengguna;
  aksi baru boleh aktif kembali setelah perangkat memberikan sampel baru yang tidak ditandai mock.
  Deteksi ini harus dilapis dengan App Check, Play Integrity/App Attest, validasi server, timestamp,
  dan audit. Kontrol aplikasi bukan pengganti MDM dan tidak dapat menjamin perangkat tidak
  di-root/jailbreak.
- Foto hanya berasal dari kamera aplikasi; izin photo library tidak diminta.
- Offline queue maksimum 12 jam dan payload sensitif dienkripsi memakai kunci dari secure storage.
- Custom claims menentukan role; Security Rules bersifat deny-by-default.
- Minimal dua akun supervisor/admin diperlukan untuk cross-approval.

## Retensi

Foto selfie disimpan tiga bulan lalu dihapus oleh scheduled function, tanpa backup foto. Data presensi, approval, correction, dan audit disimpan satu tahun. Backup bulanan hanya berisi data, bukan foto.

Karyawan keluar dinonaktifkan segera. Auth/contact/profile dihapus setelah tiga bulan, sedangkan nama dan Employee ID dipertahankan pada histori presensi sampai masa retensinya berakhir.

## Rahasia

Jangan commit file environment, service account, google-services.json, GoogleService-Info.plist, signing key, atau token CI. Gunakan Firebase environment/secrets dan secret manager Codemagic. Nilai konfigurasi Firebase web bukan service-account secret, tetapi tetap dikelola melalui environment per deployment.
