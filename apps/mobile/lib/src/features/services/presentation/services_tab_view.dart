import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';

import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/attendance/presentation/camera_selfie_dialog.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

int calculateEffectiveWorkingDays(DateTime start, DateTime end) {
  final startDay = DateTime.utc(start.year, start.month, start.day);
  final endDay = DateTime.utc(end.year, end.month, end.day);
  if (endDay.isBefore(startDay)) return 0;

  var count = 0;
  var cursor = startDay;
  while (!cursor.isAfter(endDay)) {
    if (cursor.weekday != DateTime.saturday &&
        cursor.weekday != DateTime.sunday) {
      count += 1;
    }
    cursor = cursor.add(const Duration(days: 1));
  }
  return count;
}

String generateUuidV4() {
  final random = math.Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hex(int byte) => byte.toRadixString(16).padLeft(2, '0');
  return '${hex(bytes[0])}${hex(bytes[1])}${hex(bytes[2])}${hex(bytes[3])}-'
      '${hex(bytes[4])}${hex(bytes[5])}-'
      '${hex(bytes[6])}${hex(bytes[7])}-'
      '${hex(bytes[8])}${hex(bytes[9])}-'
      '${hex(bytes[10])}${hex(bytes[11])}${hex(bytes[12])}${hex(bytes[13])}${hex(bytes[14])}${hex(bytes[15])}';
}

class ServicesTabView extends StatefulWidget {
  const ServicesTabView({
    required this.profile,
    this.photoCaptureOverride,
    this.onSubmitOverride,
    this.requestsOverride,
    super.key,
  });

  final EmployeeProfile profile;
  final Future<String?> Function(BuildContext context)? photoCaptureOverride;
  final Future<void> Function(Map<String, dynamic> payload)? onSubmitOverride;
  final List<Map<String, dynamic>>? requestsOverride;

  @override
  State<ServicesTabView> createState() => _ServicesTabViewState();
}

class _ServicesTabViewState extends State<ServicesTabView> {
  static const int _annualQuota = 12;

  bool get _hasOneYearTenure {
    final startDate = DateTime.tryParse(widget.profile.employmentStartDate);
    if (startDate == null) return false;
    final oneYearLater = DateTime(
      startDate.year + 1,
      startDate.month,
      startDate.day,
    );
    final now = DateTime.now();
    return now.isAfter(oneYearLater) || now.isAtSameMomentAs(oneYearLater);
  }

  bool get _canApplyAnnualLeave {
    return _hasOneYearTenure &&
        widget.profile.employmentStatus != EmploymentStatus.intern;
  }

  int _computeApprovedAnnualLeaveDays(List<Map<String, dynamic>> items) {
    final currentYear = DateTime.now().year.toString();
    var used = 0;
    for (final data in items) {
      final type = data['type'] as String? ?? '';
      final status = data['status'] as String? ?? '';
      final startStr =
          (data['startDate'] as String?) ?? (data['date'] as String?) ?? '';
      if (type == 'annual_leave' &&
          status == 'approved' &&
          startStr.startsWith(currentYear)) {
        final days = data['workingDaysCount'] as int?;
        if (days != null && days > 0) {
          used += days;
        } else {
          final s = DateTime.tryParse(startStr);
          final e =
              DateTime.tryParse((data['endDate'] as String?) ?? startStr) ?? s;
          if (s != null && e != null) {
            used += math.max(calculateEffectiveWorkingDays(s, e), 1);
          } else {
            used += 1;
          }
        }
      }
    }
    return used;
  }

  String? _toOptionalDataUrl(Object? raw) {
    if (raw is! String || raw.trim().isEmpty) return null;
    final trimmed = raw.trim();
    if (trimmed.startsWith('data:image/')) return trimmed;
    return 'data:image/jpeg;base64,$trimmed';
  }

  Future<void> _submitServicePayload(Map<String, dynamic> payload) async {
    if (widget.onSubmitOverride != null) {
      await widget.onSubmitOverride!(payload);
      return;
    }
    if (Firebase.apps.isNotEmpty && AppConfig.useFirebaseEmulators) {
      try {
        final functions = FirebaseFunctions.instanceFor(
          region: AppConfig.firebaseRegion,
        );
        functions.useFunctionsEmulator(
          AppConfig.firebaseEmulatorHost,
          AppConfig.functionsEmulatorPort,
        );
        final callable = functions.httpsCallable('submitServiceRequest');
        await callable.call<Map<dynamic, dynamic>>(payload);
        return;
      } on FirebaseFunctionsException catch (e) {
        throw StateError(e.message ?? 'Gagal mengirim pengajuan layanan.');
      } catch (_) {
        // Fallback for isolated widget tests without Functions emulator
      }
    }

    final selfieDataUrl = _toOptionalDataUrl(payload['selfieBase64']);
    final attachmentDataUrl = _toOptionalDataUrl(payload['attachmentBase64']);

    await FirebaseFirestore.instance.collection('serviceRequests').add({
      'userId': widget.profile.uid,
      'employeeId': widget.profile.employeeId,
      'fullName': widget.profile.fullName,
      'jobTitle': widget.profile.jobTitle,
      'type': payload['type'],
      'date': payload['startDate'],
      'startDate': payload['startDate'],
      'endDate': payload['endDate'] ?? payload['startDate'],
      'startedAt': payload['startedAt'],
      'endedAt': payload['endedAt'],
      'clientOrLocation': payload['clientOrLocation'],
      'reason': payload['reason'],
      'durationOrDays': payload['durationOrDays'],
      'workingDaysCount': payload['workingDaysCount'],
      'durationMinutes': payload['durationMinutes'],
      'isOver8Hours': payload['isOver8Hours'] ?? false,
      'selfieStoragePath': ?selfieDataUrl,
      'attachmentStoragePath': ?attachmentDataUrl,
      'status': 'pending',
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  void _openAnnualLeaveSheet(BuildContext context, int remainingQuota) {
    if (!_canApplyAnnualLeave) {
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Ketentuan Cuti Tahunan'),
          content: Text(
            'Sesuai aturan perusahaan, cuti tahunan (12 hari/tahun) '
            'hanya berlaku bagi karyawan tetap/kontrak dengan masa kerja minimal 1 tahun.\n\n'
            'Masa kerja Anda terhitung mulai ${widget.profile.employmentStartDate}. '
            'Untuk keperluan saat ini, silakan gunakan opsi "Izin Keperluan Khusus".',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Mengerti'),
            ),
          ],
        ),
      );
      return;
    }

    _LeavePermissionBottomSheet.show(
      context: context,
      type: 'annual_leave',
      title: 'Pengajuan Cuti Tahunan',
      subtitle:
          'Minimal diajukan H-1. Sabtu & Minggu otomatis tidak memotong kuota.',
      reasonHint: 'Tuliskan alasan cuti (misal: Acara keluarga di luar kota)',
      icon: Icons.beach_access_rounded,
      accentColor: Theme.of(context).colorScheme.primary,
      remainingAnnualQuota: remainingQuota,
      photoCaptureOverride: widget.photoCaptureOverride,
      onSubmit: _submitServicePayload,
    );
  }

  void _openSickLeaveSheet(BuildContext context) {
    _LeavePermissionBottomSheet.show(
      context: context,
      type: 'sick_leave',
      title: 'Pengajuan Izin Sakit',
      subtitle: 'Dapat diajukan maksimal H+3. Lampiran surat dokter bersifat opsional.',
      reasonHint: 'Keluhan sakit atau diagnosa singkat',
      icon: Icons.local_hospital_rounded,
      accentColor: Colors.teal.shade700,
      photoCaptureOverride: widget.photoCaptureOverride,
      onSubmit: _submitServicePayload,
    );
  }

  void _openPermissionSheet(BuildContext context) {
    _LeavePermissionBottomSheet.show(
      context: context,
      type: 'permission',
      title: 'Izin Keperluan Khusus',
      subtitle:
          'Pengajuan izin untuk keperluan pribadi, keluarga, atau darurat.',
      reasonHint: 'Jelaskan keperluan izin secara singkat & jelas',
      icon: Icons.assignment_rounded,
      accentColor: Theme.of(context).colorScheme.secondary,
      photoCaptureOverride: widget.photoCaptureOverride,
      onSubmit: _submitServicePayload,
    );
  }

  void _openOvertimeSheet(BuildContext context) {
    _OvertimeBottomSheet.show(
      context: context,
      photoCaptureOverride: widget.photoCaptureOverride,
      onSubmit: _submitServicePayload,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: (() {
        if (widget.requestsOverride != null) return null;
        try {
          return FirebaseFirestore.instance
              .collection('serviceRequests')
              .where('userId', isEqualTo: widget.profile.uid)
              .snapshots();
        } catch (_) {
          return null;
        }
      })(),
      builder: (context, snapshot) {
        final items = List<Map<String, dynamic>>.of(
          widget.requestsOverride ??
              (snapshot.data?.docs.map((d) => d.data()).toList() ?? []),
        );
        items.sort((a, b) {
          final dateA =
              (a['startDate'] as String?) ?? (a['date'] as String?) ?? '';
          final dateB =
              (b['startDate'] as String?) ?? (b['date'] as String?) ?? '';
          return dateB.compareTo(dateA);
        });

        final usedAnnualDays = _computeApprovedAnnualLeaveDays(items);
        final remainingAnnualDays = _canApplyAnnualLeave
            ? math.max(_annualQuota - usedAnnualDays, 0)
            : 0;
        final pendingAnnualCount = items.where((data) {
          return data['type'] == 'annual_leave' && data['status'] == 'pending';
        }).length;

        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            _GlassAnnualLeaveCard(
              canApplyAnnualLeave: _canApplyAnnualLeave,
              remainingDays: remainingAnnualDays,
              usedDays: usedAnnualDays,
              totalQuota: _annualQuota,
              pendingCount: pendingAnnualCount,
              employmentStartDate: widget.profile.employmentStartDate,
            ),
            const SizedBox(height: 22),
            Text(
              'Layanan & Pengajuan',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _ServiceActionCard(
                    icon: Icons.beach_access_outlined,
                    title: 'Pengajuan Cuti',
                    subtitle: 'Min. H-1 • 12 Hari/Thn',
                    color: colors.primary,
                    onTap: () =>
                        _openAnnualLeaveSheet(context, remainingAnnualDays),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ServiceActionCard(
                    icon: Icons.local_hospital_outlined,
                    title: 'Izin Sakit',
                    subtitle: 'Maks. H+3 • Foto Opsional',
                    color: Colors.teal.shade700,
                    onTap: () => _openSickLeaveSheet(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _ServiceActionCard(
                    icon: Icons.more_time_outlined,
                    title: 'Pengajuan Lembur',
                    subtitle: 'Mulai 17:01 WIB',
                    color: colors.tertiary,
                    onTap: () => _openOvertimeSheet(context),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ServiceActionCard(
                    icon: Icons.assignment_outlined,
                    title: 'Izin Khusus',
                    subtitle: 'Keperluan pribadi',
                    color: colors.secondary,
                    onTap: () => _openPermissionSheet(context),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Status Permohonan Terkini',
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colors.onSurfaceVariant,
                  ),
                ),
                if (items.isNotEmpty)
                  Text(
                    '${items.length} Pengajuan',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            if (items.isEmpty)
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 28,
                    horizontal: 16,
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.inbox_outlined,
                        size: 40,
                        color: Colors.grey.shade400,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Belum ada permohonan aktif',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Pengajuan lembur, izin, atau cuti yang Anda kirimkan akan muncul statusnya secara real-time di sini.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              )
            else
              Column(
                children: items.map((data) {
                  return _ServiceRequestHistoryCard(
                    data: data,
                    onTap: () =>
                        _ServiceRequestDetailBottomSheet.show(context, data),
                  );
                }).toList(),
              ),
          ],
        );
      },
    );
  }
}

class _GlassAnnualLeaveCard extends StatelessWidget {
  const _GlassAnnualLeaveCard({
    required this.canApplyAnnualLeave,
    required this.remainingDays,
    required this.usedDays,
    required this.totalQuota,
    required this.pendingCount,
    required this.employmentStartDate,
  });

  final bool canApplyAnnualLeave;
  final int remainingDays;
  final int usedDays;
  final int totalQuota;
  final int pendingCount;
  final String employmentStartDate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final progress = canApplyAnnualLeave && totalQuota > 0
        ? (remainingDays / totalQuota).clamp(0.0, 1.0)
        : 0.0;

    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: canApplyAnnualLeave
                  ? [
                      colors.primary.withValues(alpha: 0.14),
                      colors.tertiary.withValues(alpha: 0.08),
                    ]
                  : [
                      colors.surfaceContainerHighest.withValues(alpha: 0.85),
                      colors.surfaceContainerHighest.withValues(alpha: 0.55),
                    ],
            ),
            border: Border.all(
              color: canApplyAnnualLeave
                  ? colors.primary.withValues(alpha: 0.24)
                  : Colors.grey.shade300,
            ),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: canApplyAnnualLeave
                              ? colors.primary.withValues(alpha: 0.15)
                              : Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.beach_access_rounded,
                          size: 20,
                          color: canApplyAnnualLeave
                              ? colors.primary
                              : Colors.grey.shade700,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'Sisa Cuti Tahunan',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  Chip(
                    label: Text(
                      canApplyAnnualLeave ? '$remainingDays Hari' : '0 Hari',
                    ),
                    backgroundColor: canApplyAnnualLeave
                        ? colors.primary
                        : Colors.grey.shade400,
                    labelStyle: TextStyle(
                      color: canApplyAnnualLeave
                          ? colors.onPrimary
                          : Colors.black87,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              if (canApplyAnnualLeave) ...[
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 7,
                    backgroundColor: colors.primary.withValues(alpha: 0.15),
                    valueColor: AlwaysStoppedAnimation<Color>(colors.primary),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Terpakai (Disetujui): $usedDays dari $totalQuota Hari',
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: colors.primary,
                      ),
                    ),
                    if (pendingCount > 0)
                      Text(
                        '$pendingCount Menunggu Approval',
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Colors.amber.shade900,
                        ),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 8),
              Text(
                canApplyAnnualLeave
                    ? 'Hak cuti 12 hari/tahun aktif untuk periode kalender 2026. '
                          'Kuota hanya dipotong setelah pengajuan disetujui Admin; akhir pekan tidak memotong saldo.'
                    : 'Masa kerja Anda belum mencapai 1 tahun (Mulai: $employmentStartDate). '
                          'Sesuai aturan perusahaan, gunakan opsi Izin untuk ketidakhadiran.',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ServiceRequestHistoryCard extends StatelessWidget {
  const _ServiceRequestHistoryCard({required this.data, required this.onTap});

  final Map<String, dynamic> data;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final type = data['type'] as String? ?? 'permission';
    final status = data['status'] as String? ?? 'pending';
    final startDate =
        (data['startDate'] as String?) ?? (data['date'] as String?) ?? '';
    final endDate = (data['endDate'] as String?) ?? startDate;
    final reason = data['reason'] as String? ?? '';
    final durationOrDays = data['durationOrDays'] as String?;
    final adminNotes = data['adminNotes'] as String?;
    final hasPhoto =
        (data['selfieStoragePath'] != null) ||
        (data['attachmentStoragePath'] != null);

    final typeTitle = type == 'annual_leave'
        ? 'Cuti Tahunan'
        : type == 'sick_leave'
        ? 'Izin Sakit'
        : type == 'overtime'
        ? 'Lembur'
        : 'Izin Khusus';

    final statusColor = status == 'approved'
        ? Colors.green.shade700
        : status == 'rejected'
        ? Colors.red.shade700
        : Colors.amber.shade800;

    final statusLabel = status == 'approved'
        ? 'Disetujui'
        : status == 'rejected'
        ? 'Ditolak'
        : 'Menunggu Persetujuan';

    final periodText = startDate == endDate
        ? startDate
        : '$startDate s/d $endDate';

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: colors.primaryContainer.withAlpha(90),
                    child: Icon(
                      type == 'annual_leave'
                          ? Icons.beach_access_rounded
                          : type == 'sick_leave'
                          ? Icons.local_hospital_rounded
                          : type == 'overtime'
                          ? Icons.more_time_rounded
                          : Icons.assignment_rounded,
                      color: colors.primary,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          typeTitle,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          'Tanggal: $periodText${durationOrDays != null ? ' • $durationOrDays' : ''}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                reason,
                style: theme.textTheme.bodySmall,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (adminNotes != null && adminNotes.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Catatan Admin: "$adminNotes"',
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontStyle: FontStyle.italic,
                    color: colors.primary,
                  ),
                ),
              ],
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (hasPhoto) ...[
                    Icon(
                      Icons.photo_camera_outlined,
                      size: 13,
                      color: colors.primary,
                    ),
                    const SizedBox(width: 4),
                  ],
                  Text(
                    'Lihat Detail',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: colors.primary,
                    ),
                  ),
                  Icon(
                    Icons.chevron_right_rounded,
                    size: 16,
                    color: colors.primary,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LeavePermissionBottomSheet extends StatefulWidget {
  const _LeavePermissionBottomSheet({
    required this.type,
    required this.title,
    required this.subtitle,
    required this.reasonHint,
    required this.icon,
    required this.accentColor,
    required this.onSubmit,
    this.remainingAnnualQuota,
    this.photoCaptureOverride,
  });

  final String type;
  final String title;
  final String subtitle;
  final String reasonHint;
  final IconData icon;
  final Color accentColor;
  final int? remainingAnnualQuota;
  final Future<String?> Function(BuildContext context)? photoCaptureOverride;
  final Future<void> Function(Map<String, dynamic> payload) onSubmit;

  static Future<void> show({
    required BuildContext context,
    required String type,
    required String title,
    required String subtitle,
    required String reasonHint,
    required IconData icon,
    required Color accentColor,
    required Future<void> Function(Map<String, dynamic> payload) onSubmit,
    int? remainingAnnualQuota,
    Future<String?> Function(BuildContext context)? photoCaptureOverride,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LeavePermissionBottomSheet(
        type: type,
        title: title,
        subtitle: subtitle,
        reasonHint: reasonHint,
        icon: icon,
        accentColor: accentColor,
        remainingAnnualQuota: remainingAnnualQuota,
        photoCaptureOverride: photoCaptureOverride,
        onSubmit: onSubmit,
      ),
    );
  }

  @override
  State<_LeavePermissionBottomSheet> createState() =>
      _LeavePermissionBottomSheetState();
}

class _LeavePermissionBottomSheetState
    extends State<_LeavePermissionBottomSheet> {
  late DateTime _startDate;
  late DateTime _endDate;
  final _reasonController = TextEditingController();
  String? _attachmentBase64;
  String? _errorMessage;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    // Annual leave requires minimum H-1, so default to tomorrow
    _startDate = widget.type == 'annual_leave'
        ? today.add(const Duration(days: 1))
        : today;
    _endDate = _startDate;
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _pickStartDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final firstDate = widget.type == 'annual_leave'
        ? today.add(const Duration(days: 1))
        : today.subtract(const Duration(days: 3));
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate.isBefore(firstDate) ? firstDate : _startDate,
      firstDate: firstDate,
      lastDate: today.add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        _startDate = picked;
        if (_endDate.isBefore(_startDate)) {
          _endDate = _startDate;
        }
        _errorMessage = null;
      });
    }
  }

  Future<void> _pickEndDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate.isBefore(_startDate) ? _startDate : _endDate,
      firstDate: _startDate,
      lastDate: today.add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() {
        _endDate = picked;
        _errorMessage = null;
      });
    }
  }

  Future<void> _captureAttachment() async {
    final capture = widget.photoCaptureOverride ?? CameraSelfieDialog.show;
    final photo = await capture(context);
    if (photo != null && mounted) {
      setState(() {
        _attachmentBase64 = photo;
        _errorMessage = null;
      });
    }
  }

  Future<void> _handleSubmit() async {
    final workingDays = calculateEffectiveWorkingDays(_startDate, _endDate);
    final calendarDays = _endDate.difference(_startDate).inDays + 1;
    final reason = _reasonController.text.trim();

    if (widget.type == 'annual_leave') {
      if (workingDays <= 0) {
        setState(() {
          _errorMessage = 'Rentang tanggal cuti harus mencakup minimal 1 hari kerja efektif (Senin–Jumat).';
        });
        return;
      }
      final quota = widget.remainingAnnualQuota ?? 12;
      if (workingDays > quota) {
        setState(() {
          _errorMessage =
              'Jumlah hari kerja ($workingDays hari) melebihi sisa kuota cuti tahunan Anda ($quota hari).';
        });
        return;
      }
    }

    final effectiveReason = reason.length >= 3 ? reason : widget.title;
    final startStr = DateFormat('yyyy-MM-dd').format(_startDate);
    final endStr = DateFormat('yyyy-MM-dd').format(_endDate);
    final durationLabel = widget.type == 'annual_leave'
        ? '$workingDays Hari Kerja'
        : '${workingDays > 0 ? workingDays : calendarDays} Hari';

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final messenger = ScaffoldMessenger.of(context);
      final navigator = Navigator.of(context);
      await widget.onSubmit({
        'idempotencyKey': generateUuidV4(),
        'type': widget.type,
        'startDate': startStr,
        'endDate': endStr,
        'reason': effectiveReason,
        'workingDaysCount': workingDays,
        'durationOrDays': durationLabel,
        if (_attachmentBase64 != null) 'attachmentBase64': _attachmentBase64,
      });
      if (mounted) {
        navigator.pop();
        messenger.showSnackBar(
          SnackBar(
            content: Text('${widget.title} berhasil diajukan ke Admin.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _errorMessage = e.toString().replaceFirst('Bad state: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final workingDays = calculateEffectiveWorkingDays(_startDate, _endDate);
    final calendarDays = _endDate.difference(_startDate).inDays + 1;
    final remainingAfterApproval = widget.remainingAnnualQuota != null
        ? math.max(widget.remainingAnnualQuota! - workingDays, 0)
        : null;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DraggableScrollableSheet(
        initialChildSize: 0.82,
        minChildSize: 0.55,
        maxChildSize: 0.94,
        expand: false,
        builder: (context, scrollController) {
          return ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
              child: Container(
                decoration: BoxDecoration(
                  color: colors.surface.withValues(alpha: 0.94),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(28),
                  ),
                  border: Border(
                    top: BorderSide(
                      color: Colors.white.withValues(alpha: 0.65),
                      width: 1.2,
                    ),
                  ),
                ),
                child: Column(
                  children: [
                    _GlassSheetHeader(
                      title: widget.title,
                      subtitle: widget.subtitle,
                      icon: widget.icon,
                      accentColor: widget.accentColor,
                      onClose: () => Navigator.of(context).pop(),
                    ),
                    Expanded(
                      child: ListView(
                        controller: scrollController,
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                        children: [
                          Text(
                            'Periode Tanggal',
                            style: theme.textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _DateTileButton(
                                  label: 'Tanggal Mulai',
                                  dateText: DateFormat(
                                    'dd MMM yyyy',
                                    'id_ID',
                                  ).format(_startDate),
                                  onTap: _pickStartDate,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _DateTileButton(
                                  label: 'Tanggal Selesai',
                                  dateText: DateFormat(
                                    'dd MMM yyyy',
                                    'id_ID',
                                  ).format(_endDate),
                                  onTap: _pickEndDate,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _GlassCalculationBanner(
                            icon: Icons.event_available_rounded,
                            accentColor: widget.accentColor,
                            primaryText:
                                'Durasi: $workingDays Hari Kerja Efektif ($calendarDays hari kalender)',
                            secondaryText: remainingAfterApproval != null
                                ? 'Sabtu/Minggu tidak dihitung • Estimasi sisa kuota setelah disetujui: $remainingAfterApproval dari 12 Hari'
                                : 'Sabtu & Minggu otomatis dikecualikan dari perhitungan hari kerja.',
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _reasonController,
                            decoration: InputDecoration(
                              labelText: 'Keterangan',
                              hintText: widget.reasonHint,
                              filled: true,
                              fillColor: colors.surfaceContainerLowest,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            maxLines: 3,
                          ),
                          const SizedBox(height: 16),
                          _MediaCaptureCard(
                            title: widget.type == 'sick_leave'
                                ? 'Lampiran Surat Dokter / Bukti (Opsional)'
                                : 'Lampiran Dokumen Pendukung (Opsional)',
                            subtitle: 'Ambil foto surat keterangan atau bukti pendukung bila tersedia.',
                            base64Photo: _attachmentBase64,
                            isMandatory: false,
                            onCapture: _captureAttachment,
                            onClear: () =>
                                setState(() => _attachmentBase64 = null),
                          ),
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: colors.errorContainer,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _errorMessage!,
                                style: TextStyle(
                                  color: colors.onErrorContainer,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    _GlassSheetFooter(
                      submitLabel: _submitting
                          ? 'Mengirim...'
                          : 'Kirim Pengajuan',
                      submitting: _submitting,
                      onCancel: () => Navigator.of(context).pop(),
                      onSubmit: _handleSubmit,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _OvertimeBottomSheet extends StatefulWidget {
  const _OvertimeBottomSheet({
    required this.onSubmit,
    this.photoCaptureOverride,
  });

  final Future<String?> Function(BuildContext context)? photoCaptureOverride;
  final Future<void> Function(Map<String, dynamic> payload) onSubmit;

  static Future<void> show({
    required BuildContext context,
    required Future<void> Function(Map<String, dynamic> payload) onSubmit,
    Future<String?> Function(BuildContext context)? photoCaptureOverride,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _OvertimeBottomSheet(
        onSubmit: onSubmit,
        photoCaptureOverride: photoCaptureOverride,
      ),
    );
  }

  @override
  State<_OvertimeBottomSheet> createState() => _OvertimeBottomSheetState();
}

class _OvertimeBottomSheetState extends State<_OvertimeBottomSheet> {
  late DateTime _selectedDate;
  TimeOfDay _startTime = const TimeOfDay(hour: 17, minute: 15);
  TimeOfDay _endTime = const TimeOfDay(hour: 20, minute: 15);
  final _locationController = TextEditingController(text: 'Kantor / Lapangan');
  final _taskController = TextEditingController();
  String? _selfieBase64;
  String? _attachmentBase64;
  String? _errorMessage;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
  }

  @override
  void dispose() {
    _locationController.dispose();
    _taskController.dispose();
    super.dispose();
  }

  ({DateTime start, DateTime end, int minutes, bool crossesMidnight})
  get _computedWindow {
    final start = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );
    var end = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _endTime.hour,
      _endTime.minute,
    );
    var crossesMidnight = false;
    if (!end.isAfter(start)) {
      end = end.add(const Duration(days: 1));
      crossesMidnight = true;
    }
    final minutes = end.difference(start).inMinutes;
    return (
      start: start,
      end: end,
      minutes: minutes,
      crossesMidnight: crossesMidnight,
    );
  }

  String _formatDuration(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h > 0 && m > 0) return '$h Jam $m Menit ($minutes Menit)';
    if (h > 0) return '$h Jam ($minutes Menit)';
    return '$m Menit';
  }

  Future<void> _captureSelfie() async {
    final capture = widget.photoCaptureOverride ?? CameraSelfieDialog.show;
    final photo = await capture(context);
    if (photo != null && mounted) {
      setState(() {
        _selfieBase64 = photo;
        _errorMessage = null;
      });
    }
  }

  Future<void> _captureAttachment() async {
    final capture = widget.photoCaptureOverride ?? CameraSelfieDialog.show;
    final photo = await capture(context);
    if (photo != null && mounted) {
      setState(() {
        _attachmentBase64 = photo;
      });
    }
  }

  Future<void> _handleSubmit() async {
    final window = _computedWindow;
    final isWeekend =
        _selectedDate.weekday == DateTime.saturday ||
        _selectedDate.weekday == DateTime.sunday;

    if (!isWeekend &&
        (_startTime.hour < 17 ||
            (_startTime.hour == 17 && _startTime.minute < 1))) {
      setState(() {
        _errorMessage = 'Di hari kerja reguler (Senin–Jumat), jam mulai lembur wajib pukul 17:01 WIB ke atas.';
      });
      return;
    }

    if (_selfieBase64 == null) {
      await _captureSelfie();
      if (!mounted) return;
      if (_selfieBase64 == null) {
        setState(() {
          _errorMessage = 'Foto selfie kehadiran lembur wajib diambil sebelum mengirim pengajuan.';
        });
        return;
      }
    }

    final task = _taskController.text.trim();
    final location = _locationController.text.trim();
    final effectiveTask = task.length >= 3 ? task : 'Tugas lembur operasional';
    final effectiveLocation = location.length >= 2
        ? location
        : 'Lokasi Lapangan / Kantor';
    final durationLabel = _formatDuration(window.minutes);
    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);

    String toWibIso(DateTime dt) {
      final formatted = DateFormat("yyyy-MM-dd'T'HH:mm:ss").format(dt);
      return '$formatted+07:00';
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final messenger = ScaffoldMessenger.of(context);
      final navigator = Navigator.of(context);
      await widget.onSubmit({
        'idempotencyKey': generateUuidV4(),
        'type': 'overtime',
        'startDate': dateStr,
        'endDate': dateStr,
        'startedAt': toWibIso(window.start),
        'endedAt': toWibIso(window.end),
        'clientOrLocation': effectiveLocation,
        'reason': effectiveTask,
        'durationMinutes': window.minutes,
        'durationOrDays': durationLabel,
        'isOver8Hours': window.minutes > 480,
        'selfieBase64': _selfieBase64,
        if (_attachmentBase64 != null) 'attachmentBase64': _attachmentBase64,
      });
      if (mounted) {
        navigator.pop();
        messenger.showSnackBar(
          const SnackBar(
            content: Text(
              'Pengajuan lembur berhasil diajukan untuk persetujuan.',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _errorMessage = e.toString().replaceFirst('Bad state: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final window = _computedWindow;
    final isOver8Hours = window.minutes > 480;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DraggableScrollableSheet(
        initialChildSize: 0.88,
        minChildSize: 0.6,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
              child: Container(
                decoration: BoxDecoration(
                  color: colors.surface.withValues(alpha: 0.94),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(28),
                  ),
                  border: Border(
                    top: BorderSide(
                      color: Colors.white.withValues(alpha: 0.65),
                      width: 1.2,
                    ),
                  ),
                ),
                child: Column(
                  children: [
                    _GlassSheetHeader(
                      title: 'Pengajuan Lembur',
                      subtitle: 'Hari kerja mulai 17:01 WIB setelah check-out. Wajib selfie kehadiran.',
                      icon: Icons.more_time_rounded,
                      accentColor: colors.tertiary,
                      onClose: () => Navigator.of(context).pop(),
                    ),
                    Expanded(
                      child: ListView(
                        controller: scrollController,
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                        children: [
                          _DateTileButton(
                            label: 'Tanggal Lembur',
                            dateText: DateFormat(
                              'EEEE, dd MMMM yyyy',
                              'id_ID',
                            ).format(_selectedDate),
                            onTap: () async {
                              final now = DateTime.now();
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _selectedDate,
                                firstDate: now.subtract(
                                  const Duration(days: 7),
                                ),
                                lastDate: now.add(const Duration(days: 7)),
                              );
                              if (picked != null) {
                                setState(() => _selectedDate = picked);
                              }
                            },
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _DateTileButton(
                                  label: 'Jam Mulai (WIB)',
                                  dateText:
                                      '${_startTime.hour.toString().padLeft(2, '0')}:${_startTime.minute.toString().padLeft(2, '0')}',
                                  icon: Icons.schedule_rounded,
                                  onTap: () async {
                                    final picked = await showTimePicker(
                                      context: context,
                                      initialTime: _startTime,
                                    );
                                    if (picked != null) {
                                      setState(() => _startTime = picked);
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _DateTileButton(
                                  label: window.crossesMidnight
                                      ? 'Jam Selesai (H+1)'
                                      : 'Jam Selesai (WIB)',
                                  dateText:
                                      '${_endTime.hour.toString().padLeft(2, '0')}:${_endTime.minute.toString().padLeft(2, '0')}',
                                  icon: Icons.schedule_send_rounded,
                                  onTap: () async {
                                    final picked = await showTimePicker(
                                      context: context,
                                      initialTime: _endTime,
                                    );
                                    if (picked != null) {
                                      setState(() => _endTime = picked);
                                    }
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _GlassCalculationBanner(
                            icon: isOver8Hours
                                ? Icons.warning_amber_rounded
                                : Icons.timer_outlined,
                            accentColor: isOver8Hours
                                ? Colors.amber.shade800
                                : colors.tertiary,
                            primaryText:
                                'Total Durasi: ${_formatDuration(window.minutes)}'
                                '${window.crossesMidnight ? ' • Lintas Tengah Malam (H+1)' : ''}',
                            secondaryText: isOver8Hours
                                ? 'Peringatan: Durasi lembur melebihi 8 jam. Pastikan keselamatan kerja terjaga.'
                                : 'Durasi lembur dihitung otomatis per menit untuk verifikasi Admin.',
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _locationController,
                            decoration: InputDecoration(
                              labelText: 'Nama Klien / Lokasi Lembur',
                              hintText:
                                  'Misal: Kantor Utama atau Site PT Maju Jaya',
                              prefixIcon: const Icon(
                                Icons.location_on_outlined,
                              ),
                              filled: true,
                              fillColor: colors.surfaceContainerLowest,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _taskController,
                            decoration: InputDecoration(
                              labelText: 'Deskripsi Tugas Lembur',
                              hintText: 'Misal: Penanganan perbaikan server di kantor klien',
                              filled: true,
                              fillColor: colors.surfaceContainerLowest,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            maxLines: 3,
                          ),
                          const SizedBox(height: 14),
                          _MediaCaptureCard(
                            title: 'Foto Selfie Kehadiran Lembur (Wajib)',
                            subtitle: 'Ambil selfie langsung di lokasi lembur sebagai bukti verifikasi.',
                            base64Photo: _selfieBase64,
                            isMandatory: true,
                            onCapture: _captureSelfie,
                            onClear: () => setState(() => _selfieBase64 = null),
                          ),
                          const SizedBox(height: 10),
                          _MediaCaptureCard(
                            title: 'Lampiran SPK / Bukti Kerja (Opsional)',
                            subtitle: 'Lampirkan foto Surat Perintah Kerja atau hasil pekerjaan.',
                            base64Photo: _attachmentBase64,
                            isMandatory: false,
                            onCapture: _captureAttachment,
                            onClear: () =>
                                setState(() => _attachmentBase64 = null),
                          ),
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: colors.errorContainer,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _errorMessage!,
                                style: TextStyle(
                                  color: colors.onErrorContainer,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    _GlassSheetFooter(
                      submitLabel: _submitting
                          ? 'Mengirim...'
                          : 'Ajukan Lembur',
                      submitting: _submitting,
                      onCancel: () => Navigator.of(context).pop(),
                      onSubmit: _handleSubmit,
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ServiceRequestDetailBottomSheet extends StatefulWidget {
  const _ServiceRequestDetailBottomSheet({required this.data});

  final Map<String, dynamic> data;

  static Future<void> show(BuildContext context, Map<String, dynamic> data) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ServiceRequestDetailBottomSheet(data: data),
    );
  }

  @override
  State<_ServiceRequestDetailBottomSheet> createState() =>
      _ServiceRequestDetailBottomSheetState();
}

class _ServiceRequestDetailBottomSheetState
    extends State<_ServiceRequestDetailBottomSheet> {
  String? _selfieUrl;
  String? _attachmentUrl;
  bool _loadingMedia = true;

  @override
  void initState() {
    super.initState();
    _loadMediaUrls();
  }

  Uint8List? _decodeDataUrl(String url) {
    if (!url.startsWith('data:image/')) return null;
    final commaIdx = url.indexOf(',');
    if (commaIdx < 0) return null;
    try {
      return base64Decode(url.substring(commaIdx + 1));
    } catch (_) {
      return null;
    }
  }

  Widget _buildMediaWidget(String url) {
    final bytes = _decodeDataUrl(url);
    if (bytes != null) {
      return Image.memory(
        bytes,
        height: 190,
        width: double.infinity,
        fit: BoxFit.cover,
      );
    }
    return Image.network(
      url,
      height: 190,
      width: double.infinity,
      fit: BoxFit.cover,
    );
  }

  Future<String?> _resolveStoragePath(String? path) async {
    if (path == null || path.isEmpty) return null;
    if (path.startsWith('data:image/') ||
        path.startsWith('http://') ||
        path.startsWith('https://')) {
      return path;
    }
    if (Firebase.apps.isEmpty) return null;
    try {
      return await FirebaseStorage.instance.ref(path).getDownloadURL();
    } catch (_) {
      try {
        final bucket = FirebaseStorage.instance.bucket;
        final altBucket = bucket.contains('firebasestorage.app')
            ? bucket.replaceAll('firebasestorage.app', 'appspot.com')
            : bucket.replaceAll('appspot.com', 'firebasestorage.app');
        return await FirebaseStorage.instanceFor(bucket: altBucket)
            .ref(path)
            .getDownloadURL();
      } catch (_) {
        return null;
      }
    }
  }

  Future<void> _loadMediaUrls() async {
    final selfiePath = widget.data['selfieStoragePath'] as String?;
    final attachmentPath = widget.data['attachmentStoragePath'] as String?;
    final results = await Future.wait([
      _resolveStoragePath(selfiePath),
      _resolveStoragePath(attachmentPath),
    ]);
    if (mounted) {
      setState(() {
        _selfieUrl = results[0];
        _attachmentUrl = results[1];
        _loadingMedia = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final data = widget.data;
    final type = data['type'] as String? ?? 'permission';
    final status = data['status'] as String? ?? 'pending';
    final startDate =
        (data['startDate'] as String?) ?? (data['date'] as String?) ?? '-';
    final endDate = (data['endDate'] as String?) ?? startDate;
    final durationOrDays = data['durationOrDays'] as String? ?? '1 Hari';
    final clientOrLocation = data['clientOrLocation'] as String?;
    final reason = data['reason'] as String? ?? '-';
    final approvedByName = data['approvedByName'] as String?;
    final adminNotes = data['adminNotes'] as String?;

    final typeTitle = type == 'annual_leave'
        ? 'Detail Cuti Tahunan'
        : type == 'sick_leave'
        ? 'Detail Izin Sakit'
        : type == 'overtime'
        ? 'Detail Pengajuan Lembur'
        : 'Detail Izin Khusus';

    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.5,
      maxChildSize: 0.92,
      expand: false,
      builder: (context, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
            child: Container(
              decoration: BoxDecoration(
                color: colors.surface.withValues(alpha: 0.95),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  _GlassSheetHeader(
                    title: typeTitle,
                    subtitle: startDate == endDate
                        ? 'Tanggal: $startDate ($durationOrDays)'
                        : 'Periode: $startDate s/d $endDate ($durationOrDays)',
                    icon: Icons.info_outline_rounded,
                    accentColor: colors.primary,
                    onClose: () => Navigator.of(context).pop(),
                  ),
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(20),
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: colors.surfaceContainerLowest,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Status: ${status == 'approved'
                                    ? 'Disetujui'
                                    : status == 'rejected'
                                    ? 'Ditolak'
                                    : 'Menunggu Persetujuan Admin'}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              if (clientOrLocation != null) ...[
                                const SizedBox(height: 8),
                                Text('Lokasi / Klien: $clientOrLocation'),
                              ],
                              const SizedBox(height: 8),
                              Text('Alasan / Deskripsi:\n$reason'),
                              if (approvedByName != null ||
                                  adminNotes != null) ...[
                                const Divider(height: 20),
                                if (approvedByName != null)
                                  Text('Diproses oleh: $approvedByName'),
                                if (adminNotes != null && adminNotes.isNotEmpty)
                                  Text('Catatan Admin: "$adminNotes"'),
                              ],
                            ],
                          ),
                        ),
                        if (_loadingMedia) ...[
                          const SizedBox(height: 16),
                          const Center(child: CircularProgressIndicator()),
                        ],
                        if (_selfieUrl != null) ...[
                          const SizedBox(height: 16),
                          const Text(
                            'Foto Selfie Kehadiran Lembur',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: _buildMediaWidget(_selfieUrl!),
                          ),
                        ],
                        if (_attachmentUrl != null) ...[
                          const SizedBox(height: 16),
                          const Text(
                            'Lampiran Dokumen Pendukung',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: _buildMediaWidget(_attachmentUrl!),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _GlassSheetHeader extends StatelessWidget {
  const _GlassSheetHeader({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
    required this.onClose,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color accentColor;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 14, 14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface.withValues(alpha: 0.85),
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Column(
        children: [
          Container(
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey.shade400,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: accentColor.withValues(alpha: 0.14),
                foregroundColor: accentColor,
                child: Icon(icon, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: onClose,
                icon: const Icon(Icons.close_rounded),
                tooltip: 'Tutup',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _GlassSheetFooter extends StatelessWidget {
  const _GlassSheetFooter({
    required this.submitLabel,
    required this.submitting,
    required this.onCancel,
    required this.onSubmit,
  });

  final String submitLabel;
  final bool submitting;
  final VoidCallback onCancel;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 14),
        decoration: BoxDecoration(
          color: colors.surface.withValues(alpha: 0.88),
          border: Border(top: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Row(
          children: [
            TextButton(
              onPressed: submitting ? null : onCancel,
              child: const Text('Batal'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(
                height: 50,
                child: FilledButton(
                  onPressed: submitting ? null : onSubmit,
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    submitLabel,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateTileButton extends StatelessWidget {
  const _DateTileButton({
    required this.label,
    required this.dateText,
    required this.onTap,
    this.icon = Icons.calendar_today_rounded,
  });

  final String label;
  final String dateText;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          color: colors.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: colors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dateText,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GlassCalculationBanner extends StatelessWidget {
  const _GlassCalculationBanner({
    required this.icon,
    required this.accentColor,
    required this.primaryText,
    required this.secondaryText,
  });

  final IconData icon;
  final Color accentColor;
  final String primaryText;
  final String secondaryText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: accentColor.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accentColor.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: accentColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  primaryText,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: accentColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  secondaryText,
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MediaCaptureCard extends StatelessWidget {
  const _MediaCaptureCard({
    required this.title,
    required this.subtitle,
    required this.base64Photo,
    required this.isMandatory,
    required this.onCapture,
    required this.onClear,
  });

  final String title;
  final String subtitle;
  final String? base64Photo;
  final bool isMandatory;
  final VoidCallback onCapture;
  final VoidCallback onClear;

  Uint8List? _tryDecodeBase64(String? input) {
    if (input == null || input.isEmpty) return null;
    try {
      final cleaned = input.replaceFirst(
        RegExp(r'^data:image\/(jpeg|jpg|png);base64,', caseSensitive: false),
        '',
      );
      return base64Decode(cleaned);
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final bytes = _tryDecodeBase64(base64Photo);
    final hasPhoto = base64Photo != null && base64Photo!.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: hasPhoto
            ? Colors.green.withValues(alpha: 0.06)
            : colors.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasPhoto
              ? Colors.green.shade400
              : isMandatory
              ? colors.primary.withValues(alpha: 0.35)
              : Colors.grey.shade300,
        ),
      ),
      child: Row(
        children: [
          if (bytes != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.memory(
                bytes,
                width: 52,
                height: 52,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  width: 52,
                  height: 52,
                  color: Colors.green.shade100,
                  child: Icon(
                    Icons.check_circle_rounded,
                    color: Colors.green.shade700,
                  ),
                ),
              ),
            )
          else
            CircleAvatar(
              radius: 22,
              backgroundColor: hasPhoto
                  ? Colors.green.shade100
                  : colors.primaryContainer.withAlpha(90),
              child: Icon(
                hasPhoto
                    ? Icons.check_circle_rounded
                    : Icons.camera_alt_outlined,
                color: hasPhoto ? Colors.green.shade700 : colors.primary,
              ),
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  hasPhoto
                      ? 'Foto siap dilampirkan pada pengajuan ini.'
                      : subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 11),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          if (hasPhoto)
            IconButton(
              onPressed: onClear,
              icon: const Icon(Icons.delete_outline_rounded, size: 20),
              tooltip: 'Hapus Foto',
            ),
          OutlinedButton(
            onPressed: onCapture,
            child: Text(hasPhoto ? 'Ulangi' : 'Ambil Foto'),
          ),
        ],
      ),
    );
  }
}

class _ServiceActionCard extends StatelessWidget {
  const _ServiceActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: color.withAlpha(30),
                foregroundColor: color,
                child: Icon(icon, size: 22),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
