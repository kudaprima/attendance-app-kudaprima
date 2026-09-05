enum AttendanceSubmissionStatus { normal, late, earlyDeparture, nonWorkingDay }

class AttendanceSubmissionCommand {
  const AttendanceSubmissionCommand({
    required this.eventType,
    required this.capturedAt,
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.locationType,
    required this.idempotencyKey,
    required this.photoBase64,
    this.note,
    this.isMocked = false,
  });

  final String eventType;
  final DateTime capturedAt;
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final String locationType;
  final String idempotencyKey;
  final String photoBase64;
  final String? note;
  final bool isMocked;

  Map<String, dynamic> toJson() => {
    'eventType': eventType,
    'capturedAt': capturedAt.toUtc().toIso8601String(),
    'latitude': latitude,
    'longitude': longitude,
    'accuracyMeters': accuracyMeters,
    'locationType': locationType,
    'idempotencyKey': idempotencyKey,
    'photoBase64': photoBase64,
    if (note != null && note!.trim().isNotEmpty) 'note': note!.trim(),
    'isMocked': isMocked,
  };
}

class AttendanceSubmissionResult {
  const AttendanceSubmissionResult({
    required this.eventId,
    required this.eventType,
    required this.status,
    required this.requiresApproval,
    required this.locationType,
    required this.distanceMeters,
    required this.capturedAt,
    required this.message,
  });

  factory AttendanceSubmissionResult.fromJson(Map<String, dynamic> json) {
    final statusStr = json['status'] as String? ?? 'normal';
    final status = switch (statusStr) {
      'late' => AttendanceSubmissionStatus.late,
      'early_departure' => AttendanceSubmissionStatus.earlyDeparture,
      'non_working_day' => AttendanceSubmissionStatus.nonWorkingDay,
      _ => AttendanceSubmissionStatus.normal,
    };

    return AttendanceSubmissionResult(
      eventId: json['eventId'] as String? ?? '',
      eventType: json['eventType'] as String? ?? '',
      status: status,
      requiresApproval: json['requiresApproval'] as bool? ?? false,
      locationType: json['locationType'] as String? ?? '',
      distanceMeters: (json['distanceMeters'] as num?)?.toDouble() ?? 0.0,
      capturedAt: json['capturedAt'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }

  final String eventId;
  final String eventType;
  final AttendanceSubmissionStatus status;
  final bool requiresApproval;
  final String locationType;
  final double distanceMeters;
  final String capturedAt;
  final String message;
}
