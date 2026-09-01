import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:firebase_auth/firebase_auth.dart';

abstract final class AuthErrorMessage {
  static String from(Object error) {
    if (error is InvalidRoleClaimException) {
      return 'Akun belum memiliki peran yang valid. Hubungi admin atau jalankan '
          'ulang seeder Auth Emulator.';
    }

    if (error is FirebaseAuthException) {
      return switch (error.code) {
        'invalid-email' => 'Format email tidak valid.',
        'invalid-credential' ||
        'user-not-found' ||
        'wrong-password' => 'Email atau kata sandi tidak sesuai.',
        'user-disabled' => 'Akun ini telah dinonaktifkan.',
        'too-many-requests' =>
          'Terlalu banyak percobaan. Tunggu sebentar lalu coba kembali.',
        'network-request-failed' =>
          'Auth Emulator tidak dapat dijangkau. Periksa Terminal 1.',
        _ => 'Autentikasi gagal. Silakan coba kembali.',
      };
    }

    return 'Autentikasi gagal. Silakan coba kembali.';
  }
}
