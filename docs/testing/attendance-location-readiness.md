# Attendance Location Readiness Testing

Panduan ini menguji kesiapan lokasi sebelum kamera dan command presensi tersedia. Tidak ada
event presensi atau foto yang dikirim pada tahap ini. Gunakan akun development sintetis saja.

## Persiapan

Jalankan tiga terminal dari root repositori:

```powershell
# Terminal 1: pertahankan proses ini tetap berjalan.
. .\scripts\use-dev-env.ps1
pnpm emulators:profile

# Terminal 2: jalankan setelah seluruh emulator siap.
. .\scripts\use-dev-env.ps1
pnpm emulators:profile:seed

# Terminal 3: siapkan USB route, lalu jalankan Flutter.
. .\scripts\use-dev-env.ps1
.\scripts\prepare-android-device.ps1 -Serial <DEVICE_ID>
Set-Location .\apps\mobile
flutter run -d <DEVICE_ID> --dart-define=USE_FIREBASE_EMULATORS=true --dart-define=FIREBASE_EMULATOR_HOST=127.0.0.1
```

Jangan memasukkan serial perangkat nyata ke konfigurasi bersama. Firebase Emulator UI harus
memuat `officeLocations/main` dengan radius 100 meter dan batas akurasi 50 meter.

## Skenario Wajib

1. Masuk sebagai teknisi dan pastikan tombol **Presensi masuk** nonaktif sebelum lokasi
   diperiksa.
2. Ketuk **Periksa lokasi**. Izinkan lokasi **saat aplikasi digunakan**; jangan pilih izin
   sepanjang waktu.
3. Dengan GPS normal, pastikan hasil menjadi **Lokasi kantor terverifikasi** bila berjarak
   maksimal 100 meter, atau **Lokasi presensi lapangan** bila di luar radius. Hasil lapangan
   harus menjelaskan bahwa catatan akan diwajibkan.
4. Matikan layanan lokasi, periksa ulang, lalu pastikan aplikasi menampilkan instruksi untuk
   mengaktifkannya tanpa crash.
5. Tolak izin lokasi. Aplikasi harus tetap menampilkan login/dashboard dan menjelaskan bahwa
   izin hanya diperlukan untuk presensi.
6. Untuk akurasi di atas 50 meter, pengambilan pertama harus meminta retry. Bila sampel kedua
   tetap buruk, hasil harus menjadi lapangan dengan flag `lowAccuracy`.

## Skenario Mock Location

Gunakan hanya aplikasi mock-location tepercaya pada perangkat development. Di Android
Developer options, pilih aplikasi tersebut pada **Select mock location app**, kirim satu lokasi
palsu, lalu ketuk **Periksa lokasi**.

Hasil wajib menampilkan **Presensi diblokir: lokasi mock terdeteksi** dan seluruh tombol aksi
presensi tetap nonaktif. Login, dashboard, logout, dan pengaturan profil harus tetap dapat
digunakan. Tidak tersedia tombol bypass.

Untuk pemulihan, hentikan aplikasi mock, ubah **Select mock location app** menjadi **Nothing**,
lalu ambil lokasi ulang. Presensi hanya boleh aktif kembali setelah perangkat memberikan sampel
baru yang tidak bertanda mock. Developer Options boleh tetap aktif.

## Bukti Uji

Catat model perangkat, versi Android, hasil setiap skenario, akurasi yang ditampilkan, dan log
yang relevan. Jangan merekam koordinat rumah/pelanggan, kredensial nyata, atau data karyawan.
Hentikan Flutter dengan `q` setelah selesai.
