# Mobile Attendance

Aplikasi Flutter karyawan PT Kuda Prima untuk Android 10+ dan iOS 15+. Mobile hanya mengambil lokasi dan selfie kamera ketika pengguna memulai presensi; tidak ada gallery upload atau background tracking.

```powershell
. ..\..\scripts\use-dev-env.ps1
flutter pub get
flutter analyze
flutter test
flutter run
```

Jangan menginisialisasi Firebase secara manual. Setelah app Android/iOS didaftarkan, gunakan FlutterFire CLI sesuai **docs/development.md** di root. Pertahankan struktur feature-first di **lib/src/features** dan letakkan aturan murni di layer domain agar dapat diuji tanpa plugin/device.
