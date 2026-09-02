import 'package:attendance/src/features/profile/data/firebase_employee_profile_repository.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:attendance/src/features/profile/domain/employee_profile_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final employeeProfileRepositoryProvider = Provider<EmployeeProfileRepository>(
  (ref) => FirebaseEmployeeProfileRepository(FirebaseFirestore.instance),
);

final employeeProfileProvider = StreamProvider.autoDispose
    .family<EmployeeProfile?, String>((ref, uid) {
      return ref.watch(employeeProfileRepositoryProvider).watchProfile(uid);
    });
