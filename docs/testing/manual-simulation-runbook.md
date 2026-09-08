# Manual Simulation Runbook: Emulators, Mobile Attendance, Firebase Suite, & Web Admin Panel

Panduan ini memuat langkah-langkah detail, perintah terminal, akun uji sintetis, dan verifikasi alur end-to-end yang dapat dijalankan secara mandiri di komputer pengembang Windows.

---

## 1. Ringkasan Arsitektur Pengujian Lokal

```text
[ Terminal 1: Firebase Emulators ] ── Port 4000 (UI), 8080 (Firestore), 9099 (Auth), 5001 (Functions), 9199 (Storage)
                                                  │
                 ┌────────────────────────────────┴────────────────────────┐
                 ▼                                                         ▼
[ Terminal 2: Flutter Android AVD ]                       [ Terminal 3: Web Admin React ]
- Target: Android 10 (API 29)                             - URL: http://localhost:5173
- Port Reverse via ADB                                    - RBAC: admin.dev / supervisor.dev
- Akun: technician.dev@kudaprima.test                     - Live Monitoring, Persetujuan, QR Code
```

---

## 2. Kredensial Akun Uji Sintetis (Local Development)

Semua akun disediakan melalui skrip seeder (`pnpm emulators:profile:seed`):

| Akun / Email | Password | Role | Hak Akses |
| :--- | :--- | :--- | :--- |
| `technician.dev@kudaprima.test` | `KudaPrimaDev2026#` | `technician` | Mobile App Presensi & Layanan. **Ditolak total dari Web Admin**. |
| `supervisor.dev@kudaprima.test` | `KudaPrimaDev2026#` | `supervisor` | Web Admin: Live Presensi, Persetujuan, Ekspor Laporan. |
| `admin.dev@kudaprima.test` | `KudaPrimaDev2026#` | `admin` | Web Admin Akses Penuh: Master Karyawan, Distribusi APK QR, Persetujuan. |

---

## 3. Langkah-Langkah Eksekusi Manual di Terminal

### Langkah 1: Persiapan Environment (Buka PowerShell 1)
Pastikan path cache tooling dan Android AVD diarahkan ke Drive D:

```powershell
# Jalankan di root repositori
cd "D:\KudaPrima\Project Management\daily_attandance"
. .\scripts\use-dev-env.ps1
```

---

### Langkah 2: Jalankan Firebase Emulator Suite & Seeding Database
Di **PowerShell 1**, jalankan emulator:

```powershell
pnpm emulators:profile
```

**Hasil yang diharapkan**:
- Emulator Auth aktif di port `9099`
- Emulator Firestore aktif di port `8080`
- Emulator Functions aktif di port `5001` (diinisialisasi cepat dalam <1 detik berkat lazy loading)
- Emulator Storage aktif di port `9199`
- **Firebase Emulator UI** aktif di browser: [http://127.0.0.1:4000](http://127.0.0.1:4000)

> [!IMPORTANT]
> **Wajib Mengisi Data Awal (Seeding)**:
> Saat pertama kali emulator menyala, database Auth dan Firestore masih kosong.
> Buka tab/jendela terminal baru dan jalankan perintah:
> ```powershell
> pnpm emulators:profile:seed
> ```
> Perintah ini akan langsung mendaftarkan akun `technician.dev`, `supervisor.dev`, `admin.dev`, membuat profil karyawan di Firestore (`KP-000001`, `KP-000002`, `KP-000003`), serta menyetel lokasi kantor utama `officeLocations/main`.
> Setelah itu, cek [http://127.0.0.1:4000/auth](http://127.0.0.1:4000/auth) dan [http://127.0.0.1:4000/firestore](http://127.0.0.1:4000/firestore) untuk memastikan data sudah masuk.

> [!NOTE]
> Biarkan **PowerShell 1** tetap berjalan di latar belakang selama Anda melakukan simulasi.

---

### Langkah 3: Jalankan Android Emulator AVD (Buka PowerShell 2)
Buka terminal baru (**PowerShell 2**), aktifkan environment, dan nyalakan emulator:

```powershell
cd "D:\KudaPrima\Project Management\daily_attandance"
. .\scripts\use-dev-env.ps1

# Nyalakan Android 10 AVD (API 29)
.\scripts\start-android-emulator.ps1
```

Tunggu hingga AVD selesai booting dan muncul di home screen Android.
Pastikan koneksi ADB tersambung:

```powershell
adb devices
# Harus menampilkan: emulator-5554    device
```

Aktifkan port reverse agar emulator Android dapat mengakses service Firebase di localhost laptop:

```powershell
adb reverse tcp:9099 tcp:9099
adb reverse tcp:8080 tcp:8080
adb reverse tcp:5001 tcp:5001
adb reverse tcp:9199 tcp:9199
```

---

### Langkah 4: Jalankan Aplikasi Flutter Mobile (Di PowerShell 2)
Di **PowerShell 2**, masuk ke direktori mobile dan jalankan aplikasi dengan flag emulator:

```powershell
cd apps\mobile
flutter run --dart-define=USE_FIREBASE_EMULATORS=true -d emulator-5554
```

#### Simulasi Pengujian di Handphone / Emulator:
1. **Layar Login**:
   - Tekan tombol pengisian cepat dev mode atau ketik:
     - Email: `technician.dev@kudaprima.test`
     - Password: `Password123!`
   - Tekan **Masuk**.
2. **Tab 1: Presensi**:
   - Perhatikan bahwa tampilan kini rapi dan tidak berdempetan (spacing 16dp).
   - Tekan **Periksa Lokasi**:
     - Jika di luar kantor (radius > 100m), status menjadi "Presensi Lapangan".
   - Tekan **Presensi Masuk**:
     - Jika lokasi lapangan, dialog catatan wajib akan muncul. Masukkan catatan: `Pemasangan kabel internet di klien A`.
     - Kamera viewfinder langsung akan terbuka. Arahkan wajah ke oval panduan dan ambil selfie.
     - Pratinjau selfie tampil, tekan **Kirim Presensi**.
     - Notifikasi hijau sukses muncul, dan tombol beralih ke state siap presensi pulang.
3. **Tab 2: Layanan**:
   - Ketuk tab **Layanan** di bar navigasi bawah.
   - Lihat kartu **Kuota Cuti**: Menampilkan sisa kuota cuti tahunan dengan validasi masa kerja.
   - Lihat 4 menu cepat: *Pengajuan Cuti*, *Izin Sakit*, *Pengajuan Lembur*, dan *Izin Khusus*.
   - Cek daftar status pengajuan aktif.
4. **Tab 3: Riwayat**:
   - Ketuk tab **Riwayat**: Periksa ringkasan kehadiran bulanan dan log presensi masuk yang baru saja Anda kirimkan.
5. **Tab 4: Profil**:
   - Ketuk tab **Profil**: Lihat kartu identitas resmi karyawan (NIK `KP-000001`, Teknisi, Tetap).
   - Tekan tombol **Ubah** pada kartu Kontak: Ubah nomor telepon dan alamat domisili -> simpan.
   - Gulir ke bawah, lihat kartu **Versi Aplikasi Sideloaded v1.0.0** dan tekan **Bagikan QR Code Aplikasi** untuk melihat modal QR unduhan APK.

---

### Langkah 5: Jalankan Web Admin Portal (Buka PowerShell 3)
Buka terminal baru (**PowerShell 3**), aktifkan environment, dan jalankan dev server admin:

```powershell
cd "D:\KudaPrima\Project Management\daily_attandance"
. .\scripts\use-dev-env.ps1

pnpm dev:admin
```

Buka browser di laptop Anda dan akses: [http://localhost:5173](http://localhost:5173)

#### Skenario Uji 1: Uji Pemblokiran Role Teknisi (RBAC Gate)
1. Di layar login admin, klik tombol quick-fill **Teknisi (Ditolak)** atau ketik:
   - Email: `technician.dev@kudaprima.test`
   - Password: `Password123!`
2. Tekan **Masuk ke Portal**.
3. **Hasil yang diharapkan**:
   - Muncul layar merah **Akses Ditolak (Khusus Supervisor & Admin)**.
   - Menjelaskan bahwa teknisi harus menggunakan aplikasi Android.
   - Klik tombol **Kembali ke Halaman Login**.

#### Skenario Uji 2: Uji Akses Supervisor & Live Attendance Monitoring
1. Di layar login admin, klik quick-fill **Supervisor** (`supervisor.dev@kudaprima.test`).
2. Tekan **Masuk ke Portal**.
3. **Hasil yang diharapkan**:
   - Masuk ke dashboard admin dengan badge peran ungu **Supervisor**.
   - Pada tabel **Presensi Langsung Hari Ini**, Anda langsung melihat event presensi masuk teknisi yang dikirim dari handphone pada Langkah 4 secara realtime (tercatat nama, role Teknisi, geofence Lapangan, catatan teknisi, jam WIB, dan foto selfie).
4. Klik tab **Pusat Persetujuan**:
   - Periksa daftar lembur, cuti, dan izin sakit.
   - Perhatikan aturan **Cross-Approval**: jika pemohon adalah akun supervisor yang sedang login, tombol tindakan berstatus non-aktif dengan tanda `🚫 Self-Approval dilarang`.
5. Klik tombol **Keluar / Logout** di header kanan atas.

#### Skenario Uji 3: Uji Akses Penuh Admin & Distribusi APK QR Code
1. Di layar login admin, klik quick-fill **Admin** (`admin.dev@kudaprima.test`).
2. Tekan **Masuk ke Portal**.
3. **Hasil yang diharapkan**:
   - Dashboard terbuka dengan badge peran biru **Admin**.
   - Klik menu **Distribusi APK**:
     - Muncul kartu **Distribusi Sideloaded Android APK**.
     - Muncul **QR Code Vektor SVG** beresolusi tajam yang dapat di-scan langsung menggunakan kamera smartphone Anda.
     - Terdapat tombol **Unduh File APK Langsung** dan tombol **Cetak Poster QR Code**.
     - Terdapat panduan langkah aktivasi izin instalasi pihak ketiga di Android.
   - Klik menu **Master Karyawan**:
     - Menampilkan direktori seluruh karyawan (Teknisi, Supervisor, Admin) dengan NIK, email, kuota cuti, dan opsi deaktifasi akun.
   - Klik menu **Laporan**:
     - Menampilkan rekapitulasi kehadiran dan tombol **Ekspor CSV**.

---

### Langkah 6: Menghentikan Simulasi & Membebaskan Resource Laptop

Setelah selesai melakukan pengetesan, matikan seluruh proses di masing-masing terminal agar tidak memakan memori/CPU:

1. **PowerShell 3 (Admin Web)**: Tekan `Ctrl + C`, lalu ketik `Y`.
2. **PowerShell 2 (Flutter Mobile)**: Tekan tombol `q` untuk keluar dari `flutter run`.
   - Tutup AVD emulator dari terminal:
     ```powershell
     adb emu kill
     ```
3. **PowerShell 1 (Firebase Emulators)**: Tekan `Ctrl + C`, lalu ketik `Y`.
4. Bersihkan port ADB reverse jika diperlukan:
   ```powershell
   adb reverse --remove-all
   ```
