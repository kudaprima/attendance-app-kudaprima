import 'dart:async';

import 'package:attendance/src/app.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/domain/auth_repository.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/application/profile_providers.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:attendance/src/features/profile/domain/employee_profile_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('id_ID'));

  testWidgets('shows the authenticated attendance home', (tester) async {
    final repository = _FakeAuthRepository(_technicianSession);
    final profileRepository = _FakeEmployeeProfileRepository(
      _technicianProfile,
    );
    addTearDown(repository.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          employeeProfileRepositoryProvider.overrideWithValue(
            profileRepository,
          ),
        ],
        child: const AttendanceApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('PT Kuda Prima'), findsOneWidget);
    expect(find.text('Presensi masuk'), findsOneWidget);
    expect(find.text('KP-000001 • Teknisi'), findsOneWidget);
  });

  testWidgets('returns to login after sign out', (tester) async {
    final repository = _FakeAuthRepository(_technicianSession);
    final profileRepository = _FakeEmployeeProfileRepository(
      _technicianProfile,
    );
    addTearDown(repository.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          employeeProfileRepositoryProvider.overrideWithValue(
            profileRepository,
          ),
        ],
        child: const AttendanceApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Keluar'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-brand-logo')), findsOneWidget);
    expect(find.text('Masuk ke aplikasi presensi'), findsOneWidget);
    expect(repository.signOutCalls, 1);
  });

  testWidgets('blocks an authenticated account without a profile', (
    tester,
  ) async {
    final repository = _FakeAuthRepository(_technicianSession);
    addTearDown(repository.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          employeeProfileRepositoryProvider.overrideWithValue(
            const _FakeEmployeeProfileRepository(null),
          ),
        ],
        child: const AttendanceApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Profil belum tersedia'), findsOneWidget);
    expect(find.text('Presensi masuk'), findsNothing);
  });

  testWidgets('blocks an inactive employee profile', (tester) async {
    final repository = _FakeAuthRepository(_technicianSession);
    addTearDown(repository.close);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(repository),
          employeeProfileRepositoryProvider.overrideWithValue(
            _FakeEmployeeProfileRepository(_inactiveTechnicianProfile),
          ),
        ],
        child: const AttendanceApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Akun dinonaktifkan'), findsOneWidget);
    expect(find.text('Presensi masuk'), findsNothing);
  });
}

const _technicianSession = AuthSession(
  uid: 'dev-technician',
  email: 'technician.dev@kudaprima.test',
  displayName: 'Teknisi Development',
  role: UserRole.technician,
);

final _technicianProfile = EmployeeProfile(
  uid: 'dev-technician',
  employeeId: 'KP-000001',
  email: 'technician.dev@kudaprima.test',
  fullName: 'Teknisi Development',
  role: UserRole.technician,
  employmentStatus: EmploymentStatus.contract,
  employmentStartDate: '2025-01-01',
  active: true,
  createdAt: DateTime.utc(2026),
  updatedAt: DateTime.utc(2026),
);

final _inactiveTechnicianProfile = EmployeeProfile(
  uid: _technicianProfile.uid,
  employeeId: _technicianProfile.employeeId,
  email: _technicianProfile.email,
  fullName: _technicianProfile.fullName,
  role: _technicianProfile.role,
  employmentStatus: _technicianProfile.employmentStatus,
  employmentStartDate: _technicianProfile.employmentStartDate,
  active: false,
  createdAt: _technicianProfile.createdAt,
  updatedAt: _technicianProfile.updatedAt,
);

class _FakeEmployeeProfileRepository implements EmployeeProfileRepository {
  const _FakeEmployeeProfileRepository(this.profile);

  final EmployeeProfile? profile;

  @override
  Stream<EmployeeProfile?> watchProfile(String uid) => Stream.value(profile);
}

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
