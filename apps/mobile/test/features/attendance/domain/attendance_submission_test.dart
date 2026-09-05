import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AttendanceSubmissionCommand', () {
    test('serializes to JSON correctly', () {
      final now = DateTime.utc(2026, 9, 1, 1, 0);
      final command = AttendanceSubmissionCommand(
        eventType: 'check_in',
        capturedAt: now,
        latitude: -6.214737,
        longitude: 106.760897,
        accuracyMeters: 10.0,
        locationType: 'office',
        idempotencyKey: '00000000-0000-0000-0000-000000000001',
        photoBase64: 'base64photo',
        note: '   ',
        isMocked: false,
      );

      final json = command.toJson();
      expect(json['eventType'], 'check_in');
      expect(json['capturedAt'], '2026-09-01T01:00:00.000Z');
      expect(json['latitude'], -6.214737);
      expect(json['longitude'], 106.760897);
      expect(json['accuracyMeters'], 10.0);
      expect(json['locationType'], 'office');
      expect(json['idempotencyKey'], '00000000-0000-0000-0000-000000000001');
      expect(json['photoBase64'], 'base64photo');
      expect(json.containsKey('note'), isFalse);
      expect(json['isMocked'], isFalse);
    });

    test('serializes field note when present', () {
      final now = DateTime.utc(2026, 9, 1, 1, 0);
      final command = AttendanceSubmissionCommand(
        eventType: 'check_in',
        capturedAt: now,
        latitude: -6.22,
        longitude: 106.78,
        accuracyMeters: 15.0,
        locationType: 'field',
        idempotencyKey: '00000000-0000-0000-0000-000000000002',
        photoBase64: 'base64photo',
        note: 'Lokasi klien A',
        isMocked: false,
      );

      final json = command.toJson();
      expect(json['note'], 'Lokasi klien A');
    });
  });

  group('AttendanceSubmissionResult', () {
    test('deserializes from JSON correctly', () {
      final json = {
        'eventId': 'ev-123',
        'eventType': 'check_in',
        'status': 'late',
        'requiresApproval': true,
        'locationType': 'office',
        'distanceMeters': 12.5,
        'capturedAt': '2026-09-01T08:20:00+07:00',
        'message': 'Presensi masuk terlambat.',
      };

      final result = AttendanceSubmissionResult.fromJson(json);
      expect(result.eventId, 'ev-123');
      expect(result.eventType, 'check_in');
      expect(result.status, AttendanceSubmissionStatus.late);
      expect(result.requiresApproval, isTrue);
      expect(result.distanceMeters, 12.5);
      expect(result.message, 'Presensi masuk terlambat.');
    });
  });
}
