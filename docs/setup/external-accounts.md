# External Accounts Checklist

## Sekarang

1. Firebase/Google Cloud project development sudah menggunakan ID **kuda-prima-attandance-dev**.
2. Jalankan **pnpm firebase login** sendiri di browser; agent tidak membutuhkan password atau OTP.
3. Tambahkan Android app **com.kudaprima.attendance**, iOS app dengan bundle ID yang sama, dan web app admin melalui Firebase Console.
4. Aktifkan Auth providers, Firestore, Storage, App Check, dan Cloud Messaging setelah app registration.
5. Upgrade Blaze hanya ketika emulator selesai dan deployment dev pertama memang diperlukan.

## Sebelum publikasi

- Cari atau ajukan D-U-N-S gratis melalui Apple D-U-N-S lookup. Aman disiapkan belakangan; gunakan nama badan hukum, alamat, dan telepon yang persis sama di dokumen perusahaan.
- Daftar Apple Developer Organization setelah D-U-N-S tersinkron. Build/sign iOS akan menggunakan Codemagic karena Windows tidak dapat melakukan signing iOS.
- Hubungkan repository ke Codemagic dan jalankan workflow **mobile-quality** secara manual. Workflow signing/publishing baru ditambahkan setelah Apple Developer Organization dan App Store Connect API key tersedia.
- Daftar Google Play Console sebagai organisasi memakai data legal yang sama.
- Buat environment production sebagai Firebase project terpisah; jangan mengubah project dev menjadi production.

Jangan mengirim password, recovery code, service-account key, atau signing certificate melalui chat.
