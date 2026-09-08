import 'package:attendance/src/features/profile/domain/employee_profile.dart';

abstract interface class EmployeeProfileRepository {
  Stream<EmployeeProfile?> watchProfile(String uid);
  Future<void> updateContactInfo({
    required String uid,
    String? phone,
    String? homeAddress,
  });
}
