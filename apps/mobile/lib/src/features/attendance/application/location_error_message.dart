import 'package:attendance/src/features/attendance/domain/device_location_service.dart';
import 'package:attendance/src/features/attendance/domain/office_location_repository.dart';

abstract final class LocationErrorMessage {
  static String from(Object error) {
    return switch (error) {
      DeviceLocationServiceDisabledException() =>
        'Aktifkan layanan lokasi perangkat, lalu coba lagi.',
      LocationPermissionDeniedException() =>
        'Izin lokasi diperlukan hanya saat melakukan presensi.',
      LocationPermissionPermanentlyDeniedException() =>
        'Izin lokasi diblokir. Aktifkan izin Lokasi di Pengaturan aplikasi.',
      LocationCaptureTimeoutException() => 'Lokasi belum diperoleh dalam 20 detik. Pindah ke area terbuka lalu coba lagi.',
      MissingOfficeLocationException() =>
        'Konfigurasi kantor belum tersedia. Jalankan seeder development.',
      InvalidOfficeLocationException() =>
        'Konfigurasi kantor tidak valid. Hubungi administrator.',
      _ => 'Lokasi gagal diperiksa. Periksa koneksi lalu coba lagi.',
    };
  }
}
