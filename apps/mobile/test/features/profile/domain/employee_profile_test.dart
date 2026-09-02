import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('EmploymentStatus', () {
    test('maps every persisted status to an Indonesian label', () {
      expect(EmploymentStatus.fromStorage('intern')?.label, 'Magang');
      expect(EmploymentStatus.fromStorage('contract')?.label, 'Kontrak');
      expect(EmploymentStatus.fromStorage('permanent')?.label, 'Tetap');
    });

    test('rejects unknown or non-string values', () {
      expect(EmploymentStatus.fromStorage('freelance'), isNull);
      expect(EmploymentStatus.fromStorage(1), isNull);
    });
  });
}
