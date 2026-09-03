import 'package:attendance/src/features/attendance/application/location_providers.dart';
import 'package:attendance/src/features/attendance/domain/device_location_service.dart';
import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:attendance/src/features/attendance/domain/office_location_repository.dart';
import 'package:attendance/src/features/attendance/presentation/attendance_home_page.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

void main() {
  setUpAll(() => initializeDateFormatting('id_ID'));

  testWidgets('blocks attendance when the location sample is mocked', (
    tester,
  ) async {
    await tester.pumpWidget(
      _testApp(locationService: _FakeLocationService(_sample(isMocked: true))),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('check-location-button')));
    await tester.pumpAndSettle();

    expect(
      find.text('Presensi diblokir: lokasi mock terdeteksi'),
      findsOneWidget,
    );
    final attendanceButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Presensi masuk'),
    );
    expect(attendanceButton.onPressed, isNull);
  });

  testWidgets('enables attendance for a genuine office sample', (tester) async {
    await tester.pumpWidget(
      _testApp(locationService: _FakeLocationService(_sample())),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('check-location-button')));
    await tester.pumpAndSettle();

    expect(find.text('Lokasi kantor terverifikasi'), findsOneWidget);
    final attendanceButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Presensi masuk'),
    );
    expect(attendanceButton.onPressed, isNotNull);
  });

  testWidgets('requires a retry before low accuracy falls back to field', (
    tester,
  ) async {
    await tester.pumpWidget(
      _testApp(
        locationService: _FakeLocationService(_sample(accuracyMeters: 75)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('check-location-button')));
    await tester.pumpAndSettle();
    expect(find.text('Akurasi GPS belum memadai'), findsOneWidget);

    await tester.tap(find.byKey(const Key('check-location-button')));
    await tester.pumpAndSettle();
    expect(find.text('Lokasi presensi lapangan'), findsOneWidget);
    expect(find.textContaining('lowAccuracy'), findsOneWidget);
  });
}

Widget _testApp({required DeviceLocationService locationService}) {
  return ProviderScope(
    overrides: [
      officeLocationRepositoryProvider.overrideWithValue(
        const _FakeOfficeLocationRepository(),
      ),
      deviceLocationServiceProvider.overrideWithValue(locationService),
    ],
    child: MaterialApp(
      home: AttendanceHomePage(session: _session, profile: _profile),
    ),
  );
}

const _office = OfficeLocation(
  id: 'main',
  name: 'Kantor PT Kuda Prima',
  latitude: -6.214737033753623,
  longitude: 106.76089760397757,
  radiusMeters: 100,
  accuracyThresholdMeters: 50,
  timeZone: 'Asia/Jakarta',
);

const _session = AuthSession(
  uid: 'dev-technician',
  email: 'technician.dev@kudaprima.test',
  displayName: 'Teknisi Development',
  role: UserRole.technician,
);

final _profile = EmployeeProfile(
  uid: _session.uid,
  employeeId: 'KP-000001',
  email: _session.email,
  fullName: 'Teknisi Development',
  role: _session.role,
  employmentStatus: EmploymentStatus.contract,
  employmentStartDate: '2025-01-01',
  active: true,
  createdAt: DateTime.utc(2026),
  updatedAt: DateTime.utc(2026),
);

DeviceLocationSample _sample({
  double accuracyMeters = 10,
  bool isMocked = false,
}) => DeviceLocationSample(
  latitude: _office.latitude,
  longitude: _office.longitude,
  accuracyMeters: accuracyMeters,
  capturedAt: DateTime.utc(2026, 9, 3),
  isMocked: isMocked,
);

class _FakeOfficeLocationRepository implements OfficeLocationRepository {
  const _FakeOfficeLocationRepository();

  @override
  Future<OfficeLocation> fetchPrimaryOffice() async => _office;
}

class _FakeLocationService implements DeviceLocationService {
  const _FakeLocationService(this.sample);

  final DeviceLocationSample sample;

  @override
  Future<DeviceLocationSample> captureCurrentLocation() async => sample;
}
