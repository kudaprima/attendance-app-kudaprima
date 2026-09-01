import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/auth/domain/auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:firebase_auth/firebase_auth.dart';

final class FirebaseAuthRepository implements AuthRepository {
  FirebaseAuthRepository(this._auth);

  final FirebaseAuth _auth;

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
  Future<void> signInWithDevelopmentAccount({
    required String email,
    required String password,
  }) async {
    if (!AppConfig.useFirebaseEmulators) {
      throw UnsupportedError(
        'Email/password development login requires the Auth Emulator.',
      );
    }

    await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
  }

  @override
  Future<void> signOut() => _auth.signOut();
}
