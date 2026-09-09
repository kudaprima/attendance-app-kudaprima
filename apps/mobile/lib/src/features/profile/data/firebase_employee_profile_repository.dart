import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:attendance/src/features/profile/domain/employee_profile_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

final class FirebaseEmployeeProfileRepository
    implements EmployeeProfileRepository {
  FirebaseEmployeeProfileRepository(this._firestore);

  final FirebaseFirestore _firestore;

  @override
  Stream<EmployeeProfile?> watchProfile(String uid) {
    return _firestore.collection('users').doc(uid).snapshots().map((snapshot) {
      final data = snapshot.data();
      if (!snapshot.exists || data == null) return null;
      return _mapProfile(uid, data);
    });
  }

  EmployeeProfile _mapProfile(String uid, Map<String, dynamic> data) {
    final authUid = data['authUid'];
    final employeeId = data['employeeId'];
    final email = data['email'];
    final fullName = data['fullName'];
    final role = UserRole.fromClaim(data['role']);
    final employmentStatus = EmploymentStatus.fromStorage(
      data['employmentStatus'],
    );
    final employmentStartDate = data['employmentStartDate'];
    final active = data['active'];
    final createdAt = data['createdAt'];
    final updatedAt = data['updatedAt'];
    final phone = data['phone'] as String?;
    final homeAddress = data['homeAddress'] as String?;

    if (authUid != uid ||
        employeeId is! String ||
        !RegExp(r'^KP-\d{6}$').hasMatch(employeeId) ||
        email is! String ||
        email.trim().isEmpty ||
        fullName is! String ||
        fullName.trim().length < 2 ||
        role == null ||
        employmentStatus == null ||
        employmentStartDate is! String ||
        active is! bool ||
        createdAt is! Timestamp ||
        updatedAt is! Timestamp) {
      throw const InvalidEmployeeProfileException();
    }

    return EmployeeProfile(
      uid: uid,
      employeeId: employeeId,
      email: email,
      fullName: fullName.trim(),
      role: role,
      employmentStatus: employmentStatus,
      employmentStartDate: employmentStartDate,
      active: active,
      createdAt: createdAt.toDate().toUtc(),
      updatedAt: updatedAt.toDate().toUtc(),
      phone: phone,
      homeAddress: homeAddress,
    );
  }

  @override
  Future<void> updateContactInfo({
    required String uid,
    String? phone,
    String? homeAddress,
  }) async {
    final updates = <String, dynamic>{
      'updatedAt': FieldValue.serverTimestamp(),
      'updatedBy': uid,
    };
    if (phone != null) {
      updates['phone'] = phone.trim().isEmpty ? null : phone.trim();
    }
    if (homeAddress != null) {
      updates['homeAddress'] = homeAddress.trim().isEmpty
          ? null
          : homeAddress.trim();
    }
    await _firestore.collection('users').doc(uid).update(updates);
  }
}
