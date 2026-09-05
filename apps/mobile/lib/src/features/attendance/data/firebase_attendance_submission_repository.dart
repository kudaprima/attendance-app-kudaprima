import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission_repository.dart';
import 'package:cloud_functions/cloud_functions.dart';

class FirebaseAttendanceSubmissionRepository
    implements AttendanceSubmissionRepository {
  FirebaseAttendanceSubmissionRepository({FirebaseFunctions? functions})
    : _functions =
          functions ??
          FirebaseFunctions.instanceFor(region: AppConfig.firebaseRegion) {
    if (AppConfig.useFirebaseEmulators && functions == null) {
      _functions.useFunctionsEmulator(
        AppConfig.firebaseEmulatorHost,
        AppConfig.functionsEmulatorPort,
      );
    }
  }

  final FirebaseFunctions _functions;

  @override
  Future<AttendanceSubmissionResult> submitAttendance(
    AttendanceSubmissionCommand command,
  ) async {
    final callable = _functions.httpsCallable('submitAttendance');
    final response = await callable.call<Map<dynamic, dynamic>>(
      command.toJson(),
    );
    final data = Map<String, dynamic>.from(response.data);
    return AttendanceSubmissionResult.fromJson(data);
  }
}
