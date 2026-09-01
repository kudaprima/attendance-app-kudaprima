import 'package:attendance/src/core/config/app_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AppConfig Firebase emulator', () {
    test('uses the Android host loopback alias', () {
      expect(
        AppConfig.firebaseEmulatorHostFor(TargetPlatform.android),
        '10.0.2.2',
      );
    });

    test('uses localhost for Apple platforms', () {
      expect(
        AppConfig.firebaseEmulatorHostFor(TargetPlatform.iOS),
        '127.0.0.1',
      );
    });
  });
}
