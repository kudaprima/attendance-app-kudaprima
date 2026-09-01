import 'dart:async';

import 'package:attendance/src/app.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/domain/auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('id_ID'));

  testWidgets('shows the authenticated attendance home', (tester) async {
    final repository = _FakeAuthRepository(_technicianSession);
    addTearDown(repository.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
        child: const AttendanceApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('PT Kuda Prima'), findsOneWidget);
    expect(find.text('Presensi masuk'), findsOneWidget);
    expect(find.text('Peran: Teknisi'), findsOneWidget);
  });

  testWidgets('returns to login after sign out', (tester) async {
    final repository = _FakeAuthRepository(_technicianSession);
    addTearDown(repository.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
        child: const AttendanceApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Keluar'));
    await tester.pumpAndSettle();

    expect(find.text('Masuk ke aplikasi presensi'), findsOneWidget);
    expect(repository.signOutCalls, 1);
  });
}

const _technicianSession = AuthSession(
  uid: 'dev-technician',
  email: 'technician.dev@kudaprima.test',
  displayName: 'Teknisi Development',
  role: UserRole.technician,
);

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository(this._session);

  final _controller = StreamController<AuthSession?>.broadcast();
  AuthSession? _session;
  int signOutCalls = 0;

  @override
  Stream<AuthSession?> watchSession() async* {
    yield _session;
    yield* _controller.stream;
  }

  @override
  Future<void> signInWithDevelopmentAccount({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> signOut() async {
    signOutCalls += 1;
    _session = null;
    _controller.add(null);
  }

  Future<void> close() => _controller.close();
}
