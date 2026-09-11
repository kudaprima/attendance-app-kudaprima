import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:firebase_auth/firebase_auth.dart';

abstract final class AuthErrorMessage {
  static String from(Object error) {
    if (error is InvalidRoleClaimException) {
      return 'Akun belum memiliki peran yang valid. Hubungi admin PT Kuda Prima.';
    }

    if (error is FirebaseAuthException) {
      return switch (error.code) {
        'google-emulator-unavailable' => 'Login Google digunakan pada layanan online. Untuk simulasi lokal, gunakan Email dan Kata Sandi akun uji.',
        'google-sign-in-failed' => 'Login Google belum berhasil. Periksa koneksi atau konfigurasi Google aplikasi dengan admin.',
        'operation-not-allowed' =>
          'Metode login belum diaktifkan. Hubungi admin.',
        'invalid-email' => 'Format email tidak valid.',
        'invalid-credential' ||
        'user-not-found' ||
        'wrong-password' => 'Email atau kata sandi tidak sesuai.',
        'user-disabled' => 'Akun ini telah dinonaktifkan.',
        'too-many-requests' =>
          'Terlalu banyak percobaan. Tunggu sebentar lalu coba kembali.',
        'network-request-failed' =>
          AppConfig.useFirebaseEmulators
              ? 'Auth Emulator tidak dapat dijangkau di '
                    '${AppConfig.firebaseEmulatorHost}:'
                    '${AppConfig.authEmulatorPort}. Periksa konfigurasi Run dan '
                    'Terminal 1.'
              : 'Layanan login tidak dapat dijangkau. Periksa koneksi internet.',
        _ => 'Autentikasi gagal. Silakan coba kembali.',
      };
    }

    return 'Autentikasi gagal. Silakan coba kembali.';
  }
}
