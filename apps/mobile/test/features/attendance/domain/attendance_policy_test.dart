import 'package:attendance/src/features/attendance/domain/attendance_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AttendancePolicy', () {
    test('check-in opens at 07:00', () {
      expect(
        AttendancePolicy.isCheckInOpen(DateTime(2026, 9, 1, 6, 59)),
        isFalse,
      );
      expect(AttendancePolicy.isCheckInOpen(DateTime(2026, 9, 1, 7)), isTrue);
    });

    test('weekday attendance is late after 08:15', () {
      expect(AttendancePolicy.isLate(DateTime(2026, 9, 1, 8, 15)), isFalse);
      expect(AttendancePolicy.isLate(DateTime(2026, 9, 1, 8, 16)), isTrue);
    });

    test('field attendance requires a note', () {
      expect(
        AttendancePolicy.requiresNote(AttendanceLocationType.field),
        isTrue,
      );
    });
  });
}
