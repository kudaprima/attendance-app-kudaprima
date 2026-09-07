# Architecture Overview

## Batas sistem

Mobile dan admin tidak boleh menulis event presensi mentah langsung ke Firestore. Keduanya mengirim command ke Cloud Functions Gen 2; backend memvalidasi autentikasi, App Check, urutan event, aturan waktu, geofence, idempotency key, dan hak akses sebelum membuat event immutable.

```text
Flutter mobile ─┐
                ├─ Firebase Auth + App Check ─ Cloud Functions ─ Firestore
React admin ────┘                                  │              └─ Audit data
                                                   ├─ Cloud Storage (selfie)
                                                   └─ FCM / APNs
```

## Modul

- Mobile memakai feature-first layers: presentation, application, domain, dan data. Menggunakan 4-tab Material 3 Navigation (`Presensi`, `Layanan`, `Riwayat`, `Profil`).
- Distribusi mobile adalah **Sideloaded Android APK** via QR Code (target Android 10+ / API 29+) yang diunduh dari portal admin. Tidak menggunakan Google Play Store maupun Apple App Store.
- Admin memakai routes/features dan komponen shadcn/ui di **src/components/ui**. Dilindungi oleh `AdminAuthGate` dengan pemeriksaan Firebase ID Token Custom Claims (`role: admin | supervisor`). Teknisi (`technician`) diblokir dari akses web portal.
- Functions berisi use case, authorization, persistence, cross-approval enforcement, dan scheduled retention jobs.
- **packages/contracts** adalah sumber skema Zod untuk payload web/backend (presensi, cuti, lembur, profil). Model Dart dibuat terpisah agar platform mobile tidak bergantung pada tool JavaScript.

## Prinsip data

Collection **attendanceEvents** append-only. Koreksi, persetujuan, dan pembatalan dibuat sebagai record baru dengan actor, alasan, dan server timestamp. Waktu disimpan UTC dan ditampilkan sebagai Asia/Jakarta (WIB). Employee ID publik berbentuk **KP-000001**; document ID internal tetap acak.

Tidak ada pelacakan 24 jam. Lokasi dan kamera hanya digunakan ketika pengguna memulai presensi.

Konfigurasi kantor berada pada data backend yang hanya dapat diubah melalui operasi admin yang
terotorisasi dan diaudit. Client mengirim sampel lokasi serta akurasinya, tetapi Functions yang
mengambil konfigurasi aktif dan menentukan klasifikasi kantor atau lapangan.

Self-approval dilarang keras (*strict cross-approval*): supervisor atau admin dilarang menyetujui pengajuannya sendiri di level backend maupun UI.

## Profil karyawan

Dokumen **users/{authUid}** hanya dibuat oleh backend. Provisioning menghasilkan Employee ID berurutan **KP-000001**, menyimpan role, status kerja, tanggal mulai, status aktif, serta server timestamp. Counter internal berada di **systemCounters** dan setiap provisioning menambahkan record immutable di **auditLogs**.

Mobile membaca profil setelah Firebase Auth berhasil. Akun tanpa profil, nonaktif, atau memiliki role/email yang tidak konsisten tidak dapat masuk ke halaman presensi. Pengguna dapat memperbarui informasi kontak (`phone`, `homeAddress`) via dialog profil; sedangkan Employee ID, role, status kerja, tanggal mulai, dan status aktif terkunci dan read-only di Firestore Security Rules.
