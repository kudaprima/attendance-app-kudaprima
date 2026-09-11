import 'package:attendance/src/features/attendance/data/attendance_history_provider.dart';
import 'package:attendance/src/features/attendance/application/attendance_submission_providers.dart';
import 'package:attendance/src/features/attendance/application/location_providers.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission_repository.dart';
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

  testWidgets(
    'disables check-in when location is not checked, enables after genuine check',
    (tester) async {
      final fakeRepo = _FakeAttendanceSubmissionRepository(
        const AttendanceSubmissionResult(
          eventId: 'ev-test',
          eventType: 'check_in',
          status: AttendanceSubmissionStatus.normal,
          requiresApproval: false,
          locationType: 'office',
          distanceMeters: 5,
          capturedAt: '2026-09-04T08:00:00+07:00',
          message: 'Presensi berhasil dicatat.',
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            attendanceHistoryProvider.overrideWith(
              (ref, uid) => Stream.value([]),
            ),
            officeLocationRepositoryProvider.overrideWithValue(
              const _FakeOfficeLocationRepository(),
            ),
            deviceLocationServiceProvider.overrideWithValue(
              _FakeLocationService(_sample()),
            ),
            attendanceSubmissionRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(
            home: AttendanceHomePage(session: _session, profile: _profile),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Before checking location, check-in button is disabled
      var checkInButton = tester.widget<FilledButton>(
        find.byKey(const Key('check-in-button')),
      );
      expect(checkInButton.onPressed, isNull);

      // Tap check location
      await tester.tap(find.byKey(const Key('check-location-button')));
      await tester.pumpAndSettle();

      // Now check-in button should be enabled
      checkInButton = tester.widget<FilledButton>(
        find.byKey(const Key('check-in-button')),
      );
      expect(checkInButton.onPressed, isNotNull);

      // Check-out button is disabled before check-in
      final checkOutButton = tester.widget<OutlinedButton>(
        find.byKey(const Key('check-out-button')),
      );
      expect(checkOutButton.onPressed, isNull);
    },
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

class _FakeAttendanceSubmissionRepository
    implements AttendanceSubmissionRepository {
  _FakeAttendanceSubmissionRepository(this.result);
  final AttendanceSubmissionResult result;
  AttendanceSubmissionCommand? lastCommand;

  @override
  Future<AttendanceSubmissionResult> submitAttendance(
    AttendanceSubmissionCommand command,
  ) async {
    lastCommand = command;
    return result;
  }
}
