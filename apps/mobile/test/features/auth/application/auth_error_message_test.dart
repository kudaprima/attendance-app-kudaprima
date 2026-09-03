import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/auth/application/auth_error_message.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('network error identifies the configured Auth Emulator endpoint', () {
    final message = AuthErrorMessage.from(
      FirebaseAuthException(code: 'network-request-failed'),
    );

    expect(
      message,
      contains(
        '${AppConfig.firebaseEmulatorHost}:${AppConfig.authEmulatorPort}',
      ),
    );
    expect(message, contains('Periksa konfigurasi Run dan Terminal 1.'));
  });
}
