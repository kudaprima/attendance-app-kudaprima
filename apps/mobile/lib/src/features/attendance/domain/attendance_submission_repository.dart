import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';

abstract class AttendanceSubmissionRepository {
  Future<AttendanceSubmissionResult> submitAttendance(
    AttendanceSubmissionCommand command,
  );
}
