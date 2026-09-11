import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/auth/domain/auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';

final class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository(this._auth);

  final FirebaseAuth _auth;
  static Future<void>? _googleInitialization;

  @override
  Stream<AuthSession?> watchSession() {
    return _auth.idTokenChanges().asyncMap((user) async {
      if (user == null) return null;

      final token = await user.getIdTokenResult();
      final role = UserRole.fromClaim(token.claims?['role']);
      final email = user.email;

      if (role == null || email == null || email.trim().isEmpty) {
        throw const InvalidRoleClaimException();
      }

      return AuthSession(
        uid: user.uid,
        email: email,
        displayName: user.displayName,
        role: role,
      );
    });
  }

  @override
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }

  @override
  Future<void> signInWithGoogle() async {
    // Real Google credentials must never be sent to the local Auth emulator.
    if (AppConfig.useFirebaseEmulators) {
      throw FirebaseAuthException(code: 'google-emulator-unavailable');
    }
    try {
      await (_googleInitialization ??= GoogleSignIn.instance.initialize());
      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) {
        throw FirebaseAuthException(code: 'invalid-credential');
      }
      await _auth.signInWithCredential(
        GoogleAuthProvider.credential(idToken: idToken),
      );
    } on GoogleSignInException catch (error) {
      if (error.code == GoogleSignInExceptionCode.canceled) return;
      throw FirebaseAuthException(code: 'google-sign-in-failed');
    }
  }

  @override
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (error) {
      // Do not disclose whether an email belongs to an employee.
      if (error.code != 'user-not-found') rethrow;
    }
  }

  @override
  Future<void> signOut() async {
    await _auth.signOut();
    if (_googleInitialization != null) await GoogleSignIn.instance.signOut();
  }
}
