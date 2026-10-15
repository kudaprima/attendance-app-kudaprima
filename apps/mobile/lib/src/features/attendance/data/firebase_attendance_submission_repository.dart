import 'dart:math' as math;

import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/attendance/domain/attendance_policy.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission_repository.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

class FirebaseAttendanceSubmissionRepository
    implements AttendanceSubmissionRepository {
  FirebaseAttendanceSubmissionRepository({FirebaseFunctions? functions})
    : _hasCustomFunctions = functions != null,
      _functions =
          functions ??
          FirebaseFunctions.instanceFor(region: AppConfig.firebaseRegion) {
    if (AppConfig.useFirebaseEmulators && functions == null) {
      _functions.useFunctionsEmulator(
        AppConfig.firebaseEmulatorHost,
        AppConfig.functionsEmulatorPort,
      );
    }
  }

  final bool _hasCustomFunctions;
  final FirebaseFunctions _functions;

  @override
  Future<AttendanceSubmissionResult> submitAttendance(
    AttendanceSubmissionCommand command,
  ) async {
    if (AppConfig.useFirebaseEmulators || _hasCustomFunctions) {
      final callable = _functions.httpsCallable('submitAttendance');
      final response = await callable.call<Map<dynamic, dynamic>>(
        command.toJson(),
      );
      final data = Map<String, dynamic>.from(response.data);
      return AttendanceSubmissionResult.fromJson(data);
    }

    return _submitAttendanceSpark(command);
  }

  double _calculateDistanceMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const earthRadiusMeters = 6371000.0;
    final dLat = (lat2 - lat1) * math.pi / 180.0;
    final dLon = (lon2 - lon1) * math.pi / 180.0;
    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180.0) *
            math.cos(lat2 * math.pi / 180.0) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  String _toDataUrl(String rawBase64) {
    final trimmed = rawBase64.trim();
    if (trimmed.startsWith('data:image/')) return trimmed;
    return 'data:image/jpeg;base64,$trimmed';
  }

  Future<AttendanceSubmissionResult> _submitAttendanceSpark(
    AttendanceSubmissionCommand command,
  ) async {
    if (command.isMocked) {
      throw StateError('Lokasi terdeteksi menggunakan aplikasi lokasi palsu.');
    }

    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      throw StateError('Sesi pengguna berakhir. Silakan login kembali.');
    }

    final firestore = FirebaseFirestore.instance;
    final uid = currentUser.uid;

    final userSnap = await firestore.collection('users').doc(uid).get();
    final userData = userSnap.data();
    if (!userSnap.exists || userData == null || userData['active'] != true) {
      throw StateError('Akun karyawan tidak aktif atau belum terdaftar.');
    }

    final officeSnap = await firestore
        .collection('officeLocations')
        .doc('main')
        .get();
    final officeData = officeSnap.data();
    final officeLat =
        (officeData?['latitude'] as num?)?.toDouble() ?? -6.214737033753623;
    final officeLng =
        (officeData?['longitude'] as num?)?.toDouble() ?? 106.76089760397757;
    final radiusMeters =
        (officeData?['radiusMeters'] as num?)?.toDouble() ?? 100.0;

    final distanceMeters = _calculateDistanceMeters(
      command.latitude,
      command.longitude,
      officeLat,
      officeLng,
    );
    final resolvedLocationType = distanceMeters <= radiusMeters
        ? 'office'
        : 'field';

    final resolvedNote = (command.note == null || command.note!.trim().isEmpty)
        ? (resolvedLocationType == 'field' ? 'Presensi lapangan' : null)
        : command.note!.trim();

    final capturedUtc = command.capturedAt.toUtc();
    final wibTime = capturedUtc.add(const Duration(hours: 7));
    final wibDate =
        '${wibTime.year.toString().padLeft(4, '0')}-'
        '${wibTime.month.toString().padLeft(2, '0')}-'
        '${wibTime.day.toString().padLeft(2, '0')}';

    String statusStr = 'normal';
    final approvalReasons = <String>[];

    if (!AttendancePolicy.isWorkingDay(wibTime)) {
      statusStr = 'non_working_day';
      approvalReasons.add('Di Luar Hari Kerja');
    } else if (command.eventType == 'check_in' &&
        AttendancePolicy.isLate(wibTime)) {
      statusStr = 'late';
      approvalReasons.add('Terlambat');
    } else if (command.eventType == 'check_out' &&
        AttendancePolicy.isEarlyCheckout(wibTime)) {
      statusStr = 'early_departure';
      approvalReasons.add('Pulang Lebih Awal');
    }

    if (resolvedLocationType == 'field') {
      approvalReasons.add('Di Luar Lokasi (Lapangan)');
    }

    final requiresApproval = approvalReasons.isNotEmpty;

    final existingSnap = await firestore
        .collection('attendanceEvents')
        .where('userId', isEqualTo: uid)
        .get();

    final todayEvents = existingSnap.docs.map((d) => d.data()).where((data) {
      final docWibDate = data['wibDate'] as String?;
      if (docWibDate != null) return docWibDate == wibDate;
      final cap = data['capturedAt'] as String?;
      if (cap == null) return false;
      final parsed = DateTime.tryParse(cap)
          ?.toUtc()
          .add(const Duration(hours: 7));
      if (parsed == null) return false;
      final dateStr =
          '${parsed.year.toString().padLeft(4, '0')}-'
          '${parsed.month.toString().padLeft(2, '0')}-'
          '${parsed.day.toString().padLeft(2, '0')}';
      return dateStr == wibDate;
    }).toList();

    for (final existing in todayEvents) {
      if (existing['idempotencyKey'] == command.idempotencyKey) {
        return AttendanceSubmissionResult.fromJson(existing);
      }
    }

    final hasCheckIn = todayEvents.any((e) => e['eventType'] == 'check_in');
    final hasCheckOut = todayEvents.any((e) => e['eventType'] == 'check_out');

    if (command.eventType == 'check_in' && hasCheckIn) {
      throw StateError(
        'Urutan presensi tidak valid: Absen Masuk sudah tercatat hari ini.',
      );
    }
    if (command.eventType == 'check_out' && !hasCheckIn) {
      throw StateError(
        'Urutan presensi tidak valid: Lakukan Absen Masuk terlebih dahulu.',
      );
    }
    if (command.eventType == 'check_out' && hasCheckOut) {
      throw StateError(
        'Urutan presensi tidak valid: Absen Pulang sudah tercatat hari ini.',
      );
    }

    final eventRef = firestore.collection('attendanceEvents').doc();
    final eventId = eventRef.id;
    final capturedAtIso = capturedUtc.toIso8601String();
    final photoDataUrl = _toDataUrl(command.photoBase64);
    final employeeId = (userData['employeeId'] as String?) ?? 'KP-000000';
    final fullName = (userData['fullName'] as String?) ?? 'Karyawan';
    final message = command.eventType == 'check_in'
        ? 'Absen Masuk berhasil dicatat.'
        : 'Absen Pulang berhasil dicatat.';

    final eventPayload = <String, dynamic>{
      'eventId': eventId,
      'userId': uid,
      'employeeId': employeeId,
      'fullName': fullName,
      'eventType': command.eventType,
      'capturedAt': capturedAtIso,
      'wibDate': wibDate,
      'latitude': command.latitude,
      'longitude': command.longitude,
      'accuracyMeters': command.accuracyMeters,
      'locationType': resolvedLocationType,
      'distanceMeters': distanceMeters,
      'status': statusStr,
      'requiresApproval': requiresApproval,
      'approvalStatus': requiresApproval ? 'pending' : 'approved',
      'approvalReasons': approvalReasons,
      'idempotencyKey': command.idempotencyKey,
      'photoUrl': photoDataUrl,
      'photoStoragePath': photoDataUrl,
      'note': ?resolvedNote,
      'message': message,
      'createdAt': FieldValue.serverTimestamp(),
    };

    await eventRef.set(eventPayload);

    try {
      final auditRef = firestore.collection('auditLogs').doc();
      await auditRef.set({
        'action': 'attendance_${command.eventType}',
        'actorUid': uid,
        'eventId': eventId,
        'status': statusStr,
        'locationType': resolvedLocationType,
        'requiresApproval': requiresApproval,
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (_) {
      // Non-blocking audit log
    }

    return AttendanceSubmissionResult.fromJson(eventPayload);
  }
}
