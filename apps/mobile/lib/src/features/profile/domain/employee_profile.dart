import 'package:attendance/src/features/auth/domain/auth_session.dart';

enum EmploymentStatus {
  intern('Magang'),
  contract('Kontrak'),
  permanent('Tetap');

  const EmploymentStatus(this.label);

  final String label;

  static EmploymentStatus? fromStorage(Object? value) {
    if (value is! String) return null;
    for (final status in values) {
      if (status.name == value) return status;
    }
    return null;
  }
}

class EmployeeProfile {
  const EmployeeProfile({
    required this.uid,
    required this.employeeId,
    required this.email,
    required this.fullName,
    required this.role,
    required this.employmentStatus,
    required this.employmentStartDate,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
    this.phone,
    this.homeAddress,
  });

  final String uid;
  final String employeeId;
  final String email;
  final String fullName;
  final UserRole role;
  final EmploymentStatus employmentStatus;
  final String employmentStartDate;
  final bool active;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? phone;
  final String? homeAddress;

  EmployeeProfile copyWith({
    String? phone,
    String? homeAddress,
  }) {
    return EmployeeProfile(
      uid: uid,
      employeeId: employeeId,
      email: email,
      fullName: fullName,
      role: role,
      employmentStatus: employmentStatus,
      employmentStartDate: employmentStartDate,
      active: active,
      createdAt: createdAt,
      updatedAt: updatedAt,
      phone: phone ?? this.phone,
      homeAddress: homeAddress ?? this.homeAddress,
    );
  }
}

class InvalidEmployeeProfileException implements Exception {
  const InvalidEmployeeProfileException();

  @override
  String toString() => 'The employee profile data is invalid.';
}
