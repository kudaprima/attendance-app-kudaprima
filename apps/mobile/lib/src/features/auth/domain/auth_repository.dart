import 'package:attendance/src/features/auth/domain/auth_session.dart';

abstract interface class AuthRepository {
  Stream<AuthSession?> watchSession();

  Future<void> signInWithDevelopmentAccount({
    required String email,
    required String password,
  });

  Future<void> signOut();
}
