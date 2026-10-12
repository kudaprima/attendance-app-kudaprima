# Panduan Aktivasi Firebase Online, Cloud Deployment & Seeding Awal (2 Akun Admin)

Dokumen ini merupakan panduan langkah demi langkah dari nol (untuk pengguna yang belum pernah mengaktifkan layanan Firebase Online sebelumnya) hingga aplikasi **PT Kuda Prima Attendance** berjalan penuh di Cloud disertai **2 Akun Admin Awal** (tanpa role supervisor) dan distribusi APK melalui QR Code permanen.

---

## Bagian 1: Aktivasi Layanan di Firebase Console (Pertama Kali)

Buka browser dan masuk ke **[Firebase Console](https://console.firebase.google.com/)** menggunakan akun Google pemilik project **`kuda-prima-attandance-dev`**.

### 1.1. Pastikan Paket Blaze (Pay-as-you-go) & Batas Anggaran Aman
Firebase Cloud Functions Gen 2 (`nodejs22`) dan Cloud Storage membutuhkan paket **Blaze**:
1. Di pojok kiri bawah Firebase Console, lihat status paket di samping nama project. Jika masih **Spark**, klik **Upgrade** → pilih **Blaze Plan**.
2. Masukkan jumlah batas pengingat anggaran (*Budget Alert*), misalnya **$5 USD** (Rp 80.000).
   > **Catatan Hemat Biaya**: Untuk skala operasional internal (10–100 karyawan), kuota gratis bulanan (*Free Tier*) pada Blaze mencakup 2 juta pemanggilan Cloud Functions, 50.000 pembacaan Firestore/hari, dan 5 GB penyimpanan foto. Tagihan riil bulanan umumnya **$0 (Gratis)**.

### 1.2. Aktifkan Firebase Authentication (Email/Password)
1. Pada menu kiri Firebase Console, klik **Build** → **Authentication**.
2. Klik tombol **Get started**.
3. Pada tab **Sign-in method**, pilih **Email/Password**.
4. Aktifkan sakelar **Enable** pada *Email/Password* (biarkan *Email link / passwordless sign-in* mati), lalu klik **Save**.

### 1.3. Aktifkan Cloud Firestore Database
1. Pada menu kiri, klik **Build** → **Firestore Database**.
2. Klik **Create database**.
3. Pilih lokasi server terdekat: **`asia-southeast2 (Jakarta)`** (atau `asia-southeast1 (Singapore)`), lalu klik **Next**.
4. Pilih **Start in production mode**, lalu klik **Create**.

### 1.4. Aktifkan Cloud Storage (Penyimpanan Foto Selfie & Lampiran)
1. Pada menu kiri, klik **Build** → **Storage**.
2. Klik **Get started** → pilih **Start in production mode** → klik **Next**.
3. Pastikan lokasi bucket mengikuti lokasi Firestore, lalu klik **Done**.

---

## Bagian 2: Konfigurasi Environment Web Admin (`.env.production`)

Agar portal Web Admin terhubung ke Firebase Online (bukan Emulator), ambil konfigurasi Web App dari Firebase Console:

1. Klik ikon **Gear (⚙️ Project Overview)** di kiri atas → **Project settings**.
2. Gulir ke bawah ke bagian **Your apps**. Jika belum ada aplikasi Web (`</>`), klik ikon **`</>` (Web)**, beri nama `Kuda Prima Admin Portal`, centang **Also set up Firebase Hosting**, lalu klik **Register app**.
3. Salin nilai `apiKey`, `authDomain`, `projectId`, `storageBucket`, dan `appId`.
4. Buat file `apps/admin/.env.production` (file `.env*` otomatis diabaikan oleh Git demi keamanan) dengan isi berikut:

```env
VITE_USE_FIREBASE_EMULATORS=false
VITE_FIREBASE_API_KEY=AIzaSy... (isi dari Firebase Console)
VITE_FIREBASE_AUTH_DOMAIN=kuda-prima-attandance-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kuda-prima-attandance-dev
VITE_FIREBASE_STORAGE_BUCKET=kuda-prima-attandance-dev.firebasestorage.app
VITE_FIREBASE_APP_ID=1:185735017791:web:... (isi dari Firebase Console)
```

---

## Bagian 3: Build APK Android Production & Siapkan di Hosting

Agar ketika teknisi memindai **QR Code Permanen** di halaman **Distribusi APK** file langsung terunduh:

1. Buka PowerShell di root repositori dan jalankan:

```powershell
. .\scripts\use-dev-env.ps1
cd apps/mobile
flutter build apk --release --dart-define=USE_FIREBASE_EMULATORS=false
cd ../..
```

2. Salin hasil APK ke folder publik Web Admin sebelum build hosting:

```powershell
New-Item -ItemType Directory -Force -Path "apps/admin/public/download"
Copy-Item "apps/mobile/build/app/outputs/flutter-apk/app-release.apk" -Destination "apps/admin/public/download/kudaprima-attendance.apk" -Force
```

---

## Bagian 4: Login CLI & Deploy ke Firebase Cloud

Jalankan perintah berikut dari root repositori (`d:\KudaPrima\Project Management\daily_attandance`):

```powershell
# 1. Aktifkan environment drive D
. .\scripts\use-dev-env.ps1

# 2. Login ke akun Google Firebase Anda (membuka browser)
pnpm firebase login

# 3. Build seluruh kontrak, Cloud Functions, dan Web Admin (beserta file APK)
pnpm build

# 4. Deploy Firestore Rules, Storage Rules, Cloud Functions, dan Web Hosting
pnpm firebase deploy --project kuda-prima-attandance-dev
```

Setelah selesai, terminal akan menampilkan URL publik Web Admin Anda:
`https://kuda-prima-attandance-dev.web.app`

---

## Bagian 5: Seeding Awal Production (2 Akun Admin & Lokasi Kantor)

Sesuai kebijakan tata kelola **Cross-Approval** PT Kuda Prima (Admin tidak boleh menyetujui pengajuannya sendiri) dan model **2 Role Murni (`admin` & `technician`, tanpa `supervisor`)**, skrip seeding awal hanya membuat:
- **Admin 1**: `admin.utama@kudaprima.id` (`KP-000001`, Role: `admin`, Jabatan: `Administrator Utama`)
- **Admin 2**: `admin.operasional@kudaprima.id` (`KP-000002`, Role: `admin`, Jabatan: `Administrator Operasional`)
- **Lokasi Kantor Utama**: `officeLocations/main` (`Kantor PT Kuda Prima`, radius `100m`, zona waktu `Asia/Jakarta`)

### Cara Menjalankan Seeding Awal Online:

1. Di Firebase Console → **Project settings (⚙️)** → tab **Service accounts**, klik **Generate new private key** dan simpan file JSON tersebut di luar folder Git (misalnya `D:\kuda-prima-service-account.json`).
2. Jalankan perintah berikut di PowerShell:

```powershell
. .\scripts\use-dev-env.ps1
$env:GOOGLE_APPLICATION_CREDENTIALS="D:\kuda-prima-service-account.json"
$env:CONFIRM_ONLINE_PRODUCTION_SEED="true"
$env:INITIAL_ADMIN_PASSWORD="PasswordKu4t#2026"
# Opsional: sesuaikan email/nama kedua admin sebelum eksekusi
$env:ADMIN_1_EMAIL="admin.utama@kudaprima.id"
$env:ADMIN_1_NAME="Admin Utama PT Kuda Prima"
$env:ADMIN_2_EMAIL="admin.operasional@kudaprima.id"
$env:ADMIN_2_NAME="Admin Operasional PT Kuda Prima"

pnpm seed:production
```

3. Setelah muncul pesan `[OK] Created Admin: KP-000001` dan `[OK] Created Admin: KP-000002`, **hapus file `D:\kuda-prima-service-account.json`** dari komputer Anda demi keamanan.
4. Sekarang Anda dapat login ke `https://kuda-prima-attandance-dev.web.app` menggunakan salah satu dari kedua akun Admin tersebut, mencetak **Poster QR Code APK Permanen**, dan mulai mendaftarkan akun teknisi melalui menu **Karyawan**.
