import 'package:attendance/src/core/config/app_config.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

abstract final class FirebaseBootstrap {
  static Future<void> initialize() async {
    if (AppConfig.useFirebaseEmulators && kReleaseMode) {
      throw StateError('Firebase emulators cannot be used in release builds.');
    }

    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }

    if (!AppConfig.useFirebaseEmulators) return;

    await FirebaseAuth.instance.useAuthEmulator(
      AppConfig.firebaseEmulatorHost,
      AppConfig.authEmulatorPort,
    );
  }
}
