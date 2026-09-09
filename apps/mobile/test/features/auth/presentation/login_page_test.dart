import 'package:attendance/src/features/auth/domain/auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/presentation/login_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class TestAuth implements AuthRepository {
  String? email;
  String? password;
  String? resetEmail;
  int googleCalls = 0;
  @override
  Stream<AuthSession?> watchSession() => Stream.value(null);
  @override
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    this.email = email;
    this.password = password;
  }

  @override
  Future<void> signInWithGoogle() async {
    googleCalls++;
  }

  @override
  Future<void> sendPasswordResetEmail(String email) async {
    resetEmail = email;
  }

  @override
  Future<void> signOut() async {}
}

void main() {
  Future<TestAuth> showLogin(WidgetTester tester) async {
    final auth = TestAuth();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authRepositoryProvider.overrideWithValue(auth)],
        child: const MaterialApp(home: LoginPage()),
      ),
    );
    await tester.pumpAndSettle();
    return auth;
  }

  testWidgets('validates and submits credentials without fixture shortcuts', (
    tester,
  ) async {
    final auth = await showLogin(tester);
    expect(find.textContaining('technician.dev'), findsNothing);
    expect(find.textContaining('Pilih email akun uji'), findsNothing);
    await tester.tap(find.widgetWithText(FilledButton, 'Masuk'));
    await tester.pump();
    expect(auth.email, isNull);
    await tester.enterText(
      find.byKey(const Key('login-email')),
      'user@kudaprima.test',
    );
    await tester.enterText(
      find.byKey(const Key('login-password')),
      'SyntheticPassword',
    );
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Masuk'));
    await tester.tap(find.widgetWithText(FilledButton, 'Masuk'));
    await tester.pumpAndSettle();
    expect(auth.email, 'user@kudaprima.test');
    expect(auth.password, 'SyntheticPassword');
  });
  testWidgets('Google delegates to the authentication repository', (
    tester,
  ) async {
    final auth = await showLogin(tester);
    await tester.ensureVisible(find.text('Masuk dengan Google'));
    await tester.tap(find.text('Masuk dengan Google'));
    await tester.pumpAndSettle();
    expect(auth.googleCalls, 1);
  });
  testWidgets(
    'password reset validates email and does not require a password',
    (tester) async {
      final auth = await showLogin(tester);
      await tester.tap(find.text('Lupa Kata Sandi'));
      await tester.pumpAndSettle();
      expect(auth.resetEmail, isNull);
      await tester.enterText(
        find.byKey(const Key('login-email')),
        'user@kudaprima.test',
      );
      await tester.ensureVisible(find.text('Lupa Kata Sandi'));
      await tester.tap(find.text('Lupa Kata Sandi'));
      await tester.pumpAndSettle();
      expect(auth.resetEmail, 'user@kudaprima.test');
      expect(auth.password, isNull);
    },
  );
}
