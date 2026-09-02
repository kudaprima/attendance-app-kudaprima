import 'package:flutter/foundation.dart';

abstract final class AppConfig {
  static const firebaseProjectId = 'kuda-prima-attandance-dev';
  static const firebaseRegion = 'asia-southeast2';
  static const useFirebaseEmulators = bool.fromEnvironment(
    'USE_FIREBASE_EMULATORS',
  );
  static const _firebaseEmulatorHostOverride = String.fromEnvironment(
    'FIREBASE_EMULATOR_HOST',
  );
  static const authEmulatorPort = 9099;
  static const firestoreEmulatorPort = 8080;
  static const officeGeofenceRadiusMeters = 100.0;
  static const offlineQueueLimit = Duration(hours: 12);
  static const photoRetention = Duration(days: 90);

  static String get firebaseEmulatorHost {
    final override = _firebaseEmulatorHostOverride.trim();
    if (override.isNotEmpty) return override;
    if (kIsWeb) return '127.0.0.1';
    return firebaseEmulatorHostFor(defaultTargetPlatform);
  }

  static String firebaseEmulatorHostFor(
    TargetPlatform platform, {
    String override = '',
  }) {
    final normalizedOverride = override.trim();
    if (normalizedOverride.isNotEmpty) return normalizedOverride;
    return platform == TargetPlatform.android ? '10.0.2.2' : '127.0.0.1';
  }
}
