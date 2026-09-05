import 'package:attendance/src/features/attendance/data/firebase_attendance_submission_repository.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final attendanceSubmissionRepositoryProvider =
    Provider<AttendanceSubmissionRepository>((ref) {
      return FirebaseAttendanceSubmissionRepository();
    });
