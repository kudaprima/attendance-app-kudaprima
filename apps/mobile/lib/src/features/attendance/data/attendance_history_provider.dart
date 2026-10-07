import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AttendanceHistoryEntry {
  const AttendanceHistoryEntry({
    required this.result,
    this.note,
    this.approvalStatus,
    this.approvalReasons = const [],
    this.approvedByName,
    this.approvedAt,
    this.approvalNotes,
    this.latitude,
    this.longitude,
    this.accuracyMeters,
    this.photoStoragePath,
    this.photoUrl,
  });

  final AttendanceSubmissionResult result;
  final String? note;
  final String? approvalStatus;
  final List<String> approvalReasons;
  final String? approvedByName;
  final String? approvedAt;
  final String? approvalNotes;
  final double? latitude;
  final double? longitude;
  final double? accuracyMeters;
  final String? photoStoragePath;
  final String? photoUrl;

  DateTime get time =>
      DateTime.parse(result.capturedAt).toUtc().add(const Duration(hours: 7));

  String get eventType => result.eventType;
  AttendanceSubmissionStatus get status => result.status;
  bool get requiresApproval => result.requiresApproval;
  String get locationType => result.locationType;
  double get distanceMeters => result.distanceMeters;
}

final attendanceHistoryProvider = StreamProvider.autoDispose
    .family<List<AttendanceHistoryEntry>, String>((ref, uid) {
      return FirebaseFirestore.instance
          .collection('attendanceEvents')
          .where('userId', isEqualTo: uid)
          .snapshots()
          .map((snapshot) {
            final events = snapshot.docs.map((doc) {
              final data = doc.data();
              final rawReasons = data['approvalReasons'];
              final reasons = rawReasons is List
                  ? rawReasons.map((e) => e.toString()).toList()
                  : const <String>[];
              return AttendanceHistoryEntry(
                result: AttendanceSubmissionResult.fromJson(data),
                note: data['note'] as String?,
                approvalStatus: data['approvalStatus'] as String?,
                approvalReasons: reasons,
                approvedByName: data['approvedByName'] as String?,
                approvedAt: data['approvedAt'] as String?,
                approvalNotes: data['approvalNotes'] as String?,
                latitude: (data['latitude'] as num?)?.toDouble(),
                longitude: (data['longitude'] as num?)?.toDouble(),
                accuracyMeters: (data['accuracyMeters'] as num?)?.toDouble(),
                photoStoragePath: data['photoStoragePath'] as String?,
                photoUrl: data['photoUrl'] as String?,
              );
            }).toList();
            events.sort(
              (a, b) =>
                  DateTime.parse(b.result.capturedAt)
                      .compareTo(DateTime.parse(a.result.capturedAt)),
            );
            return events;
          });
    });
