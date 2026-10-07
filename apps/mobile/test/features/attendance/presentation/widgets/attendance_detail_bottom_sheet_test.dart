import 'package:attendance/src/core/theme/app_theme.dart';
import 'package:attendance/src/features/attendance/application/location_providers.dart';
import 'package:attendance/src/features/attendance/data/attendance_history_provider.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:attendance/src/features/attendance/domain/office_location_repository.dart';
import 'package:attendance/src/features/attendance/presentation/widgets/attendance_detail_bottom_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

class _FakeOfficeLocationRepository implements OfficeLocationRepository {
  const _FakeOfficeLocationRepository();

  @override
  Future<OfficeLocation> fetchPrimaryOffice() async {
    return const OfficeLocation(
      id: 'office-1',
      name: 'Kantor Utama PT Kuda Prima',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 50.0,
      accuracyThresholdMeters: 100.0,
      timeZone: 'Asia/Jakarta',
    );
  }
}

Widget _buildDetailSheetTestWidget({required AttendanceHistoryEntry entry}) {
  return ProviderScope(
    overrides: [
      officeLocationRepositoryProvider.overrideWithValue(
        const _FakeOfficeLocationRepository(),
      ),
    ],
    child: MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(
        body: Builder(
          builder: (context) {
            return Center(
              child: ElevatedButton(
                key: const Key('open-sheet-button'),
                onPressed: () =>
                    AttendanceDetailBottomSheet.show(context, entry),
                child: const Text('Open'),
              ),
            );
          },
        ),
      ),
    ),
  );
}

void main() {
  setUpAll(() => initializeDateFormatting('id_ID'));

  final testEntry = AttendanceHistoryEntry(
    result: const AttendanceSubmissionResult(
      eventId: 'evt-test-1',
      eventType: 'check_in',
      status: AttendanceSubmissionStatus.late,
      requiresApproval: true,
      locationType: 'field',
      distanceMeters: 120.0,
      capturedAt: '2026-10-06T08:30:00Z',
      message: 'OK',
    ),
    note: 'Kunjungan pengecekan server site Cikarang',
    approvalStatus: 'approved',
    approvalReasons: const ['late', 'field_attendance'],
    approvedByName: 'Manager Ahmad',
    approvalNotes: 'Pekerjaan terkonfirmasi via memo dinas',
    latitude: -6.2150,
    longitude: 106.8500,
    accuracyMeters: 12.0,
  );

  testWidgets(
    'renders AttendanceDetailBottomSheet with OSM map, coords, and metadata',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(_buildDetailSheetTestWidget(entry: testEntry));
      await tester.tap(find.byKey(const Key('open-sheet-button')));
      await tester.pumpAndSettle();

      // 1. Verify Sheet Header & Drag Handle
      expect(find.text('Detail Presensi'), findsOneWidget);
      expect(find.byIcon(Icons.close_rounded), findsOneWidget);

      // 2. Verify Status Banner
      expect(find.text('Absen Masuk'), findsOneWidget);
      expect(find.text('Terlambat'), findsOneWidget);

      // 3. Verify Photo Section & Fallback for Retention
      expect(find.text('Foto Verifikasi Wajah'), findsOneWidget);
      expect(find.text('Foto Telah Diarsipkan'), findsOneWidget);
      expect(
        find.textContaining('kebijakan retensi PT Kuda Prima'),
        findsOneWidget,
      );

      // 4. Verify OpenStreetMap & Coordinates
      expect(find.text('Lokasi & Koordinat Peta'), findsOneWidget);
      expect(find.text('OpenStreetMap'), findsOneWidget);
      expect(find.byType(FlutterMap), findsOneWidget);
      expect(find.text('Koordinat: -6.215000, 106.850000'), findsOneWidget);
      expect(find.textContaining('Jarak ke kantor: 120 m'), findsOneWidget);
      expect(find.textContaining('Akurasi GPS: ±12 m'), findsOneWidget);
      expect(find.text('Buka di Google Maps'), findsOneWidget);

      // 5. Verify Metadata & Approval Details
      expect(find.text('Tipe Lokasi'), findsOneWidget);
      expect(find.text('Luar Kantor (Lapangan)'), findsOneWidget);
      expect(find.text('Status Persetujuan'), findsOneWidget);
      expect(find.text('Disetujui'), findsOneWidget);
      expect(find.text('Keterlambatan'), findsOneWidget);
      expect(find.text('Presensi Lapangan'), findsOneWidget);
      expect(find.text('Disetujui Oleh'), findsOneWidget);
      expect(find.text('Manager Ahmad'), findsOneWidget);
      expect(find.text('Catatan Admin'), findsOneWidget);
      expect(
        find.text('Pekerjaan terkonfirmasi via memo dinas'),
        findsOneWidget,
      );
      expect(find.text('Catatan Teknisi'), findsOneWidget);
      expect(
        find.text('Kunjungan pengecekan server site Cikarang'),
        findsOneWidget,
      );
    },
  );
}
