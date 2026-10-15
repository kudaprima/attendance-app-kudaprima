# Attendance Domain Rules

## Jadwal dan presensi

- Hari kerja Senin–Jumat, 08.00–17.00 WIB, mengikuti libur nasional Indonesia.
- Check-in dibuka 07.00. Setelah 08.15 berstatus terlambat dan memerlukan persetujuan.
- Check-out sebelum 17.00 berstatus pulang awal dan memerlukan persetujuan.
- Presensi kantor memakai radius maksimum 100 meter.
- Titik kantor utama adalah `-6.214737033753623, 106.76089760397757` dengan zona waktu
  Asia/Jakarta. Konfigurasi aktif dibaca backend dan perubahannya harus diaudit.
- Akurasi horizontal di atas 50 meter meminta pengambilan lokasi ulang. Jika tetap buruk,
  presensi diperlakukan sebagai lapangan dengan catatan wajib dan flag audit `lowAccuracy`.
- Di luar radius tetap sah sebagai presensi lapangan; catatan bebas wajib, lokasi pelanggan tidak didaftarkan, dan kondisi ini sendiri tidak memerlukan persetujuan.
- Event masuk dan pulang wajib membawa selfie kamera langsung, koordinat, akurasi, device signal, captured time, serta idempotency key.

## Lembur dan koreksi

Hari kerja harus check-out lebih dulu. Lembur dapat dimulai 17.01, dicatat per menit, boleh melewati tengah malam (H+1), wajib menyertakan foto selfie kehadiran serta lokasi/klien lembur (lampiran SPK opsional), dan harus diakhiri. Akhir pekan/libur dapat langsung memulai lembur. Admin menyetujui lembur; durasi lebih dari delapan jam diberi warning keselamatan kerja.

Koreksi hanya untuk event yang terlupa, wajib alasan dan cross-approval. Event asli tidak diedit atau dihapus.

## Ketidakhadiran

Izin, sakit, dan cuti memerlukan persetujuan dan memakai rentang tanggal (`startDate` s/d `endDate`). Sakit dapat diajukan maksimal H+3, cuti minimal H-1, lampiran foto pendukung (surat dokter/dokumen) bersifat opsional. Cuti 12 hari/tahun hanya untuk karyawan kontrak/tetap setelah tepat satu tahun kerja, tanpa carry-over atau setengah hari. Hari akhir pekan (Sabtu dan Minggu) otomatis dikecualikan dari perhitungan hari kerja efektif (`workingDaysCount`) dan tidak mengurangi saldo. Kuota cuti tahunan baru dipotong ketika pengajuan berstatus disetujui (`approved`) oleh Admin; pengajuan berstatus `pending` tidak menahan saldo, namun pengajuan baru tidak boleh melebihi sisa kuota terpakai yang sudah disetujui. Magang atau masa kerja di bawah satu tahun memakai izin khusus.

Persetujuan dilakukan oleh akun berwenang (Admin) melalui Cloud Functions (`processServiceApproval`); admin dilarang menyetujui pengajuan sendiri (_strict cross-approval_).

## Konsistensi transaksi presensi

Satu pasangan masuk/pulang per karyawan per tanggal WIB. Pulang harus sesudah masuk.
Command baru maksimal berumur 12 jam; toleransi jam perangkat di masa depan maksimal
lima menit. Pengiriman ulang command yang telah tersimpan mengembalikan event yang
sama; penggunaan key sama dengan payload berbeda ditolak. Lihat ADR 0004.

## Pengelolaan karyawan melalui portal admin

- Admin aktif dengan profil serta klaim yang sesuai dapat menambah, mengedit, atau
  menghapus akun karyawan.
- Tambah karyawan memerlukan nama lengkap, alamat utama Gmail (`gmail.com`), kata
  sandi aplikasi minimal delapan karakter, status akun, status kerja (magang,
  kontrak, tetap), role (admin, teknisi), jabatan operasional (`jobTitle`), dan
  tanggal mulai bekerja yang valid. Backend menetapkan Employee ID berurutan dan klaim
  sesuai role yang dipilih.
- Edit dapat memperbarui nama lengkap, email Gmail, kata sandi, status akun, status
  kerja, role (admin/teknisi dengan perlindungan minimal dua admin aktif), dan
  jabatan (`jobTitle`). Kata sandi kosong berarti tidak diubah. UID, Employee ID, dan
  tanggal mulai bekerja tetap. Kata sandi aplikasi berbeda dari kata sandi Google.
- Hapus memerlukan konfirmasi dan langsung menghapus Firebase Auth serta profil
  `users/{uid}`. Presensi dan audit terdahulu tetap immutable sampai retensinya
  berakhir. Penonaktifan tanpa penghapusan tetap tersedia melalui status akun.
- Pengelola tidak dapat menonaktifkan atau menghapus akun yang sedang digunakannya.
- Lihat ADR 0005 untuk sinkronisasi Auth/Firestore, pengaitan Google, serta retry.
