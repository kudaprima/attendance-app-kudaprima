import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:attendance/src/features/services/presentation/services_tab_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

const _validOnePixelPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

final _eligibleProfile = EmployeeProfile(
  uid: 'tech-1',
  employeeId: 'KP-000001',
  email: 'tech1@kudaprima.test',
  fullName: 'Budi Santoso',
  role: UserRole.technician,
  jobTitle: 'Teknisi Lapangan',
  employmentStatus: EmploymentStatus.permanent,
  employmentStartDate: '2022-01-10',
  active: true,
  createdAt: DateTime.utc(2022, 1, 10),
  updatedAt: DateTime.utc(2026, 1, 1),
);

final _newHireProfile = EmployeeProfile(
  uid: 'tech-new',
  employeeId: 'KP-000099',
  email: 'new@kudaprima.test',
  fullName: 'Andi Pratama',
  role: UserRole.technician,
  jobTitle: 'Junior Teknisi',
  employmentStatus: EmploymentStatus.contract,
  employmentStartDate: DateTime.now().toIso8601String().split('T').first,
  active: true,
  createdAt: DateTime.now().toUtc(),
  updatedAt: DateTime.now().toUtc(),
);

void main() {
  setUpAll(() => initializeDateFormatting('id_ID'));

  group('calculateEffectiveWorkingDays', () {
    test('excludes Saturdays and Sundays across a full week', () {
      // 2026-10-09 (Fri) to 2026-10-12 (Mon) -> Fri + Mon = 2 working days
      final count = calculateEffectiveWorkingDays(
        DateTime(2026, 10, 9),
        DateTime(2026, 10, 12),
      );
      expect(count, 2);
    });

    test('returns 0 when range only covers weekend', () {
      // 2026-10-10 (Sat) to 2026-10-11 (Sun) -> 0 working days
      final count = calculateEffectiveWorkingDays(
        DateTime(2026, 10, 10),
        DateTime(2026, 10, 11),
      );
      expect(count, 0);
    });
  });

  testWidgets(
    'deducts annual leave quota only for approved requests and ignores pending requests',
    (tester) async {
      final currentYear = DateTime.now().year;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ServicesTabView(
              profile: _eligibleProfile,
              requestsOverride: [
                {
                  'type': 'annual_leave',
                  'status': 'approved',
                  'startDate': '$currentYear-03-02',
                  'endDate': '$currentYear-03-04',
                  'workingDaysCount': 3,
                  'durationOrDays': '3 Hari Kerja',
                  'reason': 'Cuti keluarga',
                },
                {
                  'type': 'annual_leave',
                  'status': 'pending',
                  'startDate': '$currentYear-04-06',
                  'endDate': '$currentYear-04-07',
                  'workingDaysCount': 2,
                  'durationOrDays': '2 Hari Kerja',
                  'reason': 'Cuti pribadi',
                },
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 12 total - 3 approved = 9 remaining (pending 2 days does not deduct)
      expect(find.text('9 Hari'), findsOneWidget);
      expect(find.text('Terpakai (Disetujui): 3 dari 12 Hari'), findsOneWidget);
      expect(find.textContaining('1 Menunggu Approval'), findsOneWidget);
      expect(find.text('2 Pengajuan'), findsOneWidget);
    },
  );

  testWidgets('blocks annual leave for employee with tenure < 1 year', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: ServicesTabView(profile: _newHireProfile)),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Pengajuan Cuti'));
    await tester.pumpAndSettle();

    expect(find.text('Ketentuan Cuti Tahunan'), findsOneWidget);
    expect(find.textContaining('masa kerja minimal 1 tahun'), findsOneWidget);
  });

  testWidgets(
    'opens glassmorphic sick leave bottom sheet and submits payload with attachment',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      Map<String, dynamic>? submittedPayload;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ServicesTabView(
              profile: _eligibleProfile,
              photoCaptureOverride: (_) async => _validOnePixelPngBase64,
              onSubmitOverride: (payload) async {
                submittedPayload = payload;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Izin Sakit'));
      await tester.pumpAndSettle();

      expect(find.text('Pengajuan Izin Sakit'), findsOneWidget);
      expect(
        find.text('Lampiran Surat Dokter / Bukti (Opsional)'),
        findsOneWidget,
      );

      await tester.enterText(
        find.byType(TextField),
        'Demam tinggi dan istirahat medis',
      );
      await tester.tap(find.text('Ambil Foto'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Kirim Pengajuan'));
      await tester.pumpAndSettle();

      expect(submittedPayload, isNotNull);
      expect(submittedPayload!['type'], 'sick_leave');
      expect(submittedPayload!['reason'], 'Demam tinggi dan istirahat medis');
      expect(submittedPayload!['attachmentBase64'], _validOnePixelPngBase64);
    },
  );

  testWidgets(
    'opens glassmorphic overtime bottom sheet, enforces selfie capture, and submits overtime payload',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      Map<String, dynamic>? submittedPayload;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ServicesTabView(
              profile: _eligibleProfile,
              photoCaptureOverride: (_) async => _validOnePixelPngBase64,
              onSubmitOverride: (payload) async {
                submittedPayload = payload;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Pengajuan Lembur'));
      await tester.pumpAndSettle();

      expect(find.text('Pengajuan Lembur'), findsWidgets);
      expect(find.text('Foto Selfie Kehadiran Lembur (Wajib)'), findsOneWidget);
      expect(find.textContaining('Total Durasi: 3 Jam'), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextField, 'Deskripsi Tugas Lembur'),
        'Perbaikan panel genset darurat di lokasi klien',
      );

      // Tapping Ajukan Lembur automatically triggers mandatory selfie capture
      await tester.tap(find.text('Ajukan Lembur'));
      await tester.pumpAndSettle();

      expect(submittedPayload, isNotNull);
      expect(submittedPayload!['type'], 'overtime');
      expect(submittedPayload!['durationMinutes'], 180);
      expect(
        submittedPayload!['reason'],
        'Perbaikan panel genset darurat di lokasi klien',
      );
      expect(submittedPayload!['selfieBase64'], _validOnePixelPngBase64);
    },
  );
}
