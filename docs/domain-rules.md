# Attendance Domain Rules

## Jadwal dan presensi

- Hari kerja Senin–Jumat, 08.00–17.00 WIB, mengikuti libur nasional Indonesia.
- Check-in dibuka 07.00. Setelah 08.15 berstatus terlambat dan memerlukan persetujuan.
- Check-out sebelum 17.00 berstatus pulang awal dan memerlukan persetujuan.
- Presensi kantor memakai radius maksimum 100 meter.
- Di luar radius tetap sah sebagai presensi lapangan; catatan bebas wajib, lokasi pelanggan tidak didaftarkan, dan kondisi ini sendiri tidak memerlukan persetujuan.
- Event masuk dan pulang wajib membawa selfie kamera langsung, koordinat, akurasi, device signal, captured time, serta idempotency key.

## Lembur dan koreksi

Hari kerja harus check-out lebih dulu. Lembur dapat dimulai 17.01, dicatat per menit, boleh melewati tengah malam, dan harus diakhiri. Akhir pekan/libur dapat langsung memulai lembur. Supervisor/admin menyetujui lembur; durasi lebih dari delapan jam diberi warning.

Koreksi hanya untuk event yang terlupa, wajib alasan dan cross-approval. Event asli tidak diedit atau dihapus.

## Ketidakhadiran

Izin, sakit, dan cuti memerlukan persetujuan. Sakit dapat diajukan maksimal H+3, cuti minimal H-1, lampiran opsional. Cuti 12 hari/tahun hanya untuk karyawan kontrak/tetap setelah tepat satu tahun kerja, tanpa carry-over atau setengah hari. Hari libur dan akhir pekan tidak mengurangi saldo. Pending request menahan saldo; approved request menguranginya. Magang atau masa kerja di bawah satu tahun memakai izin.

Supervisor dan admin memiliki fungsi operasional setara, tetapi tidak boleh menyetujui pengajuan sendiri.
