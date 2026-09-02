import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:firebase_core/firebase_core.dart';

abstract final class ProfileErrorMessage {
  static String from(Object error) {
    if (error is InvalidEmployeeProfileException) {
      return 'Data profil tidak valid. Hubungi admin PT Kuda Prima.';
    }

    if (error is FirebaseException) {
      return switch (error.code) {
        'permission-denied' =>
          'Profil tidak dapat diakses. Periksa status akun dengan admin.',
        'unavailable' =>
          'Firestore tidak dapat dijangkau. Periksa koneksi lalu coba kembali.',
        _ => 'Profil gagal dimuat. Silakan coba kembali.',
      };
    }

    return 'Profil gagal dimuat. Silakan coba kembali.';
  }
}
