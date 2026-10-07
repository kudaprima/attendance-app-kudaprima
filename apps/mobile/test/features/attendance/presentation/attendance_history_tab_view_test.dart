import 'dart:async';

import 'package:attendance/src/core/theme/app_theme.dart';
import 'package:attendance/src/features/attendance/data/attendance_history_provider.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/presentation/attendance_history_tab_view.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

final _testProfile = EmployeeProfile(
  uid: 'user-tech-1',
  employeeId: 'KP-000001',
  fullName: 'Budi Santoso',
  email: 'budi@kudaprima.test',
  role: UserRole.technician,
  jobTitle: 'Teknisi Lapangan',
  employmentStatus: EmploymentStatus.contract,
  employmentStartDate: '2025-01-01',
  active: true,
  createdAt: DateTime.parse('2025-01-01T00:00:00Z'),
  updatedAt: DateTime.parse('2025-01-01T00:00:00Z'),
);

AttendanceHistoryEntry _createEntry({
  required String eventId,
  required String eventType,
  required String capturedAt,
  AttendanceSubmissionStatus status = AttendanceSubmissionStatus.normal,
  bool requiresApproval = false,
  String locationType = 'office',
  double distanceMeters = 15.0,
  String? note,
  String? approvalStatus,
  List<String> approvalReasons = const [],
  String? approvedByName,
  String? approvalNotes,
  double? accuracyMeters = 8.0,
}) {
  return AttendanceHistoryEntry(
    result: AttendanceSubmissionResult(
      eventId: eventId,
      eventType: eventType,
      status: status,
      requiresApproval: requiresApproval,
      locationType: locationType,
      distanceMeters: distanceMeters,
      capturedAt: capturedAt,
      message: 'OK',
    ),
    note: note,
    approvalStatus: approvalStatus,
    approvalReasons: approvalReasons,
    approvedByName: approvedByName,
    approvalNotes: approvalNotes,
    accuracyMeters: accuracyMeters,
  );
}

Widget _buildTestWidget({
  required Stream<List<AttendanceHistoryEntry>> stream,
}) {
  return ProviderScope(
    overrides: [attendanceHistoryProvider.overrideWith((ref, uid) => stream)],
    child: MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: AttendanceHistoryTabView(profile: _testProfile)),
    ),
  );
}

void main() {
  setUpAll(() => initializeDateFormatting('id_ID'));

  testWidgets('displays loading indicator initially', (tester) async {
    final controller = StreamController<List<AttendanceHistoryEntry>>();
    addTearDown(controller.close);

    await tester.pumpWidget(_buildTestWidget(stream: controller.stream));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('displays error view and allows retry', (tester) async {
    final controller = StreamController<List<AttendanceHistoryEntry>>();
    addTearDown(controller.close);
    controller.addError(Exception('Network error'));

    await tester.pumpWidget(_buildTestWidget(stream: controller.stream));
    await tester.pumpAndSettle();

    expect(
      find.text('Riwayat belum dapat dimuat. Periksa koneksi.'),
      findsOneWidget,
    );
    expect(find.text('Coba Lagi'), findsOneWidget);
  });

  testWidgets('displays empty state when history list is empty', (
    tester,
  ) async {
    await tester.pumpWidget(_buildTestWidget(stream: Stream.value([])));
    await tester.pumpAndSettle();

    expect(find.text('Belum ada riwayat kehadiran.'), findsOneWidget);
    expect(find.text('Semua Riwayat'), findsOneWidget);
  });

  testWidgets(
    'displays attendance items with complete info, opposite icons, and Ringkasan with Terlambat metrics',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(800, 1600);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      // 2 events in current month: 1 on-time check-in and 1 late check-out
      final checkIn = _createEntry(
        eventId: 'evt-1',
        eventType: 'check_in',
        capturedAt: '2026-10-06T01:00:00.000Z', // 08:00 WIB
        status: AttendanceSubmissionStatus.normal,
        locationType: 'office',
        distanceMeters: 12.0,
        accuracyMeters: 5.0,
      );
      final checkOut = _createEntry(
        eventId: 'evt-2',
        eventType: 'check_out',
        capturedAt: '2026-10-06T10:15:00.000Z', // 17:15 WIB
        status: AttendanceSubmissionStatus.late,
        requiresApproval: true,
        approvalStatus: 'pending',
        approvalReasons: ['Terlambat', 'Di Luar Lokasi'],
        locationType: 'field',
        distanceMeters: 450.0,
        note: 'Perbaikan fiber optik di situs klien',
      );

      await tester.pumpWidget(
        _buildTestWidget(stream: Stream.value([checkOut, checkIn])),
      );
      await tester.pumpAndSettle();

      // Verify Ringkasan Kehadiran: Total Hadir and Terlambat metrics
      expect(find.text('Ringkasan Kehadiran'), findsOneWidget);
      expect(find.text('Total Hadir'), findsOneWidget);
      expect(
        find.text('1 Hari'),
        findsNWidgets(2),
      ); // 1 Hari Hadir & 1 Hari Terlambat

      // Verify Titles & Badges
      expect(find.text('Absen Masuk'), findsOneWidget);
      expect(find.text('Absen Keluar'), findsOneWidget);
      expect(find.text('Tepat Waktu'), findsOneWidget);
      expect(
        find.text('Terlambat'),
        findsNWidgets(2),
      ); // 1 in Summary metric, 1 in Card badge

      // Verify Location Info
      expect(find.text('Kantor Utama'), findsOneWidget);
      expect(find.text('Luar Kantor (Lapangan)'), findsOneWidget);
      expect(find.textContaining('12 m'), findsOneWidget);
      expect(find.textContaining('450 m'), findsOneWidget);

      // Verify Approval Info
      expect(find.text('Menunggu Persetujuan Admin'), findsOneWidget);
      expect(find.text('Alasan: Terlambat, Di Luar Lokasi'), findsOneWidget);

      // Verify Note
      expect(
        find.text('Catatan: Perbaikan fiber optik di situs klien'),
        findsOneWidget,
      );

      // Verify Opposite Icon Positions:
      // Check In: icon on the LEFT of the title
      final checkInIconFinder = find.byKey(const Key('history-icon-check-in'));
      final checkInTitleFinder = find.text('Absen Masuk');
      expect(checkInIconFinder, findsOneWidget);
      expect(checkInTitleFinder, findsOneWidget);

      final checkInIconPos = tester.getTopLeft(checkInIconFinder);
      final checkInTitlePos = tester.getTopLeft(checkInTitleFinder);
      expect(
        checkInIconPos.dx,
        lessThan(checkInTitlePos.dx),
        reason: 'Absen Masuk icon must be positioned to the LEFT (leading)',
      );

      // Check Out: icon on the RIGHT of the title
      final checkOutIconFinder = find.byKey(
        const Key('history-icon-check-out'),
      );
      final checkOutTitleFinder = find.text('Absen Keluar');
      expect(checkOutIconFinder, findsOneWidget);
      expect(checkOutTitleFinder, findsOneWidget);

      final checkOutIconPos = tester.getTopLeft(checkOutIconFinder);
      final checkOutTitlePos = tester.getTopLeft(checkOutTitleFinder);
      expect(
        checkOutIconPos.dx,
        greaterThan(checkOutTitlePos.dx),
        reason: 'Absen Keluar icon must be positioned to the RIGHT (trailing)',
      );
    },
  );

  testWidgets('filters attendance records by month picker and resets', (
    tester,
  ) async {
    // Sept 2026 entry
    final septEntry = _createEntry(
      eventId: 'evt-sept',
      eventType: 'check_in',
      capturedAt: '2026-09-15T01:00:00.000Z',
    );
    // Oct 2026 entry
    final octEntry = _createEntry(
      eventId: 'evt-oct',
      eventType: 'check_in',
      capturedAt: '2026-10-06T01:00:00.000Z',
    );

    await tester.pumpWidget(
      _buildTestWidget(stream: Stream.value([octEntry, septEntry])),
    );
    await tester.pumpAndSettle();

    // Initially both records shown
    expect(find.text('2 Catatan'), findsOneWidget);
    expect(find.text('Semua Riwayat'), findsOneWidget);

    // Tap "Pilih Bulan"
    final monthFilterBtn = find.byKey(const Key('history-filter-month-button'));
    expect(monthFilterBtn, findsOneWidget);
    await tester.tap(monthFilterBtn);
    await tester.pumpAndSettle();

    // Bottom sheet opens: tap September (month 9)
    final septMonthFinder = find.byKey(const Key('history-month-item-9'));
    expect(septMonthFinder, findsOneWidget);
    await tester.tap(septMonthFinder);
    await tester.pumpAndSettle();

    // Now filtered to September 2026
    expect(find.text('1 Catatan'), findsOneWidget);
    expect(find.textContaining('September 2026'), findsWidgets);
    expect(find.byKey(const Key('history-clear-date-filter')), findsOneWidget);

    // Clear filter
    await tester.tap(find.byKey(const Key('history-clear-date-filter')));
    await tester.pumpAndSettle();

    // All records restored
    expect(find.text('2 Catatan'), findsOneWidget);
    expect(find.text('Semua Riwayat'), findsOneWidget);
  });

  testWidgets('filters attendance records by date range picker and resets', (
    tester,
  ) async {
    final entry1 = _createEntry(
      eventId: 'evt-1',
      eventType: 'check_in',
      capturedAt: '2026-10-02T01:00:00.000Z', // 2 Oct
    );
    final entry2 = _createEntry(
      eventId: 'evt-2',
      eventType: 'check_in',
      capturedAt: '2026-10-20T01:00:00.000Z', // 20 Oct
    );

    await tester.pumpWidget(
      _buildTestWidget(stream: Stream.value([entry2, entry1])),
    );
    await tester.pumpAndSettle();

    // Tap "Rentang" button
    final rangeFilterBtn = find.byKey(const Key('history-filter-range-button'));
    expect(rangeFilterBtn, findsOneWidget);
    await tester.tap(rangeFilterBtn);
    await tester.pumpAndSettle();

    // Range picker dialog opens: select start and end dates
    final day1 = find.text('1');
    final day5 = find.text('5');
    expect(day1, findsWidgets);
    expect(day5, findsWidgets);

    await tester.tap(day1.first);
    await tester.pumpAndSettle();
    await tester.tap(day5.first);
    await tester.pumpAndSettle();

    // Tap Terapkan
    final applyBtn = find.text('Terapkan');
    expect(applyBtn, findsOneWidget);
    await tester.tap(applyBtn);
    await tester.pumpAndSettle();

    // Filtered to entries within Oct 1 - Oct 5 (only entry 1)
    expect(find.text('1 Catatan'), findsOneWidget);
    expect(find.byKey(const Key('history-clear-date-filter')), findsOneWidget);

    // Reset filter
    await tester.tap(find.byKey(const Key('history-clear-date-filter')));
    await tester.pumpAndSettle();

    expect(find.text('2 Catatan'), findsOneWidget);
  });

  testWidgets(
    'shows empty state when selected filter has no entries and resets',
    (tester) async {
      final entry = _createEntry(
        eventId: 'evt-1',
        eventType: 'check_in',
        capturedAt: '2026-10-06T01:00:00.000Z',
      );

      await tester.pumpWidget(_buildTestWidget(stream: Stream.value([entry])));
      await tester.pumpAndSettle();

      // Tap "Pilih Bulan" and select Januari (month 1, no events)
      await tester.tap(find.byKey(const Key('history-filter-month-button')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('history-month-item-1')));
      await tester.pumpAndSettle();

      // Shows empty state for filtered period
      expect(find.text('Tidak Ada Presensi'), findsOneWidget);
      expect(
        find.byKey(const Key('history-reset-empty-button')),
        findsOneWidget,
      );

      // Reset via empty button
      await tester.tap(find.byKey(const Key('history-reset-empty-button')));
      await tester.pumpAndSettle();

      // Entry back in view
      expect(find.text('Absen Masuk'), findsOneWidget);
    },
  );

  testWidgets(
    'tapping attendance history card opens AttendanceDetailBottomSheet',
    (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final controller = StreamController<List<AttendanceHistoryEntry>>();
      addTearDown(controller.close);

      await tester.pumpWidget(_buildTestWidget(stream: controller.stream));
      await tester.pump();

      controller.add([
        _createEntry(
          eventId: 'evt-detail-1',
          eventType: 'check_in',
          capturedAt: '2026-10-06T08:00:00Z',
          status: AttendanceSubmissionStatus.normal,
          note: 'Hadir tepat waktu kantor',
        ),
      ]);
      await tester.pumpAndSettle();

      expect(find.text('Absen Masuk'), findsOneWidget);
      expect(find.text('Lihat Detail & Peta'), findsOneWidget);

      // Tap the card to open detail sheet
      await tester.tap(find.byKey(const Key('history-card-check_in')));
      await tester.pumpAndSettle();

      // Verify detail sheet is displayed
      expect(find.text('Detail Presensi'), findsOneWidget);
      expect(find.text('Foto Verifikasi Wajah'), findsOneWidget);
    },
  );
}
