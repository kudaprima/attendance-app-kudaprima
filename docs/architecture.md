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

- Mobile memakai feature-first layers: presentation, application, domain, dan data.
- Admin memakai routes/features dan komponen shadcn/ui di **src/components/ui**.
- Functions berisi use case, authorization, persistence, dan scheduled retention jobs.
- **packages/contracts** adalah sumber skema Zod untuk payload web/backend. Model Dart dibuat terpisah agar platform mobile tidak bergantung pada tool JavaScript.

## Prinsip data

Collection **attendanceEvents** append-only. Koreksi, persetujuan, dan pembatalan dibuat sebagai record baru dengan actor, alasan, dan server timestamp. Waktu disimpan UTC dan ditampilkan sebagai Asia/Jakarta. Employee ID publik berbentuk **KP-000001**; document ID internal tetap acak.

Tidak ada pelacakan 24 jam. Lokasi dan kamera hanya digunakan ketika pengguna memulai presensi.
