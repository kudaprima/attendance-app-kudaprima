import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('UserRole', () {
    test('accepts only supported custom claim values', () {
      expect(UserRole.fromClaim('technician'), UserRole.technician);
      expect(UserRole.fromClaim('supervisor'), UserRole.supervisor);
      expect(UserRole.fromClaim('admin'), UserRole.admin);
      expect(UserRole.fromClaim('owner'), isNull);
      expect(UserRole.fromClaim(null), isNull);
    });
  });

  group('AuthSession', () {
    test('uses the email when the display name is empty', () {
      const session = AuthSession(
        uid: 'dev-technician',
        email: 'technician.dev@kudaprima.test',
        displayName: '  ',
        role: UserRole.technician,
      );

      expect(session.greetingName, 'technician.dev@kudaprima.test');
    });
  });
}
