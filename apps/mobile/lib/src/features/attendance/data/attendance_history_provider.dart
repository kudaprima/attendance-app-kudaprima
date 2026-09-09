import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AttendanceHistoryEntry {
  const AttendanceHistoryEntry({required this.result, this.note});
  final AttendanceSubmissionResult result;
  final String? note;
  DateTime get time =>
      DateTime.parse(result.capturedAt).toUtc().add(const Duration(hours: 7));
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
              return AttendanceHistoryEntry(
                result: AttendanceSubmissionResult.fromJson(data),
                note: data['note'] as String?,
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
