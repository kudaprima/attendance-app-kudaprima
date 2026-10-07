import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class ServicesTabView extends StatefulWidget {
  const ServicesTabView({required this.profile, super.key});

  final EmployeeProfile profile;

  @override
  State<ServicesTabView> createState() => _ServicesTabViewState();
}

class _ServicesTabViewState extends State<ServicesTabView> {
  bool get _hasOneYearTenure {
    final startDate = DateTime.tryParse(widget.profile.employmentStartDate);
    if (startDate == null) return false;
    final oneYearLater = DateTime(
      startDate.year + 1,
      startDate.month,
      startDate.day,
    );
    return DateTime.now().isAfter(oneYearLater) ||
        DateTime.now().isAtSameMomentAs(oneYearLater);
  }

  bool get _canApplyAnnualLeave {
    return _hasOneYearTenure &&
        widget.profile.employmentStatus != EmploymentStatus.intern;
  }

  void _showLeaveDialog(BuildContext context) {
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

    _showApplicationForm(
      context: context,
      title: 'Pengajuan Cuti Tahunan',
      subtitle:
          'Ketentuan: Minimal diajukan H-1. Sabtu/Minggu tidak memotong saldo.',
      hint: 'Alasan cuti (misal: urusan keluarga)',
      isLeave: true,
    );
  }

  void _showSickLeaveDialog(BuildContext context) {
    _showApplicationForm(
      context: context,
      title: 'Pengajuan Izin Sakit',
      subtitle: 'Ketentuan: Dapat diajukan hingga maksimal H+3. Surat dokter bersifat opsional.',
      hint: 'Keluhan sakit / diagnosa singkat',
    );
  }

  void _showPermissionDialog(BuildContext context) {
    _showApplicationForm(
      context: context,
      title: 'Izin Keperluan Khusus',
      subtitle: 'Pengajuan izin untuk keperluan pribadi atau mendesak.',
      hint: 'Alasan izin secara jelas',
    );
  }

  Future<void> _submitServiceRequest({
    required String type,
    required String reason,
    required String date,
  }) async {
    try {
      await FirebaseFirestore.instance.collection('serviceRequests').add({
        'userId': widget.profile.uid,
        'employeeId': widget.profile.employeeId,
        'fullName': widget.profile.fullName,
        'type': type,
        'date': date,
        'reason': reason,
        'status': 'pending',
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint('Firestore serviceRequest error: $e');
    }
  }

  void _showOvertimeDialog(BuildContext context) {
    final now = DateTime.now();
    final isWeekend =
        now.weekday == DateTime.saturday || now.weekday == DateTime.sunday;
    final hour = now.hour;
    final minute = now.minute;
    final isAfterWork = (hour > 17) || (hour == 17 && minute >= 1);
    final taskController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Pengajuan Lembur'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isWeekend
                    ? 'Hari libur/akhir pekan: Lembur dapat dimulai langsung.'
                    : isAfterWork
                    ? 'Hari kerja: Pastikan sudah check-out presensi harian sebelum memulai lembur (mulai 17:01 WIB).'
                    : 'Catatan: Di hari kerja reguler, lembur dihitung setelah jam 17:01 WIB dan wajib check-out harian terlebih dahulu.',
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: taskController,
                decoration: const InputDecoration(
                  labelText: 'Deskripsi Tugas Lembur',
                  hintText:
                      'Misal: Penanganan perbaikan server di kantor klien',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              const Text(
                '• Durasi lembur dicatat per menit dan membutuhkan persetujuan Admin.\n'
                '• Lembur lebih dari 8 jam akan diberikan tanda peringatan keselamatan kerja.',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () async {
              final task = taskController.text.trim();
              final messenger = ScaffoldMessenger.of(context);
              Navigator.of(ctx).pop();
              await _submitServiceRequest(
                type: 'overtime',
                reason: task.isEmpty ? 'Tugas lembur operasional' : task,
                date: DateFormat('yyyy-MM-dd').format(DateTime.now()),
              );
              if (mounted) {
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Pengajuan lembur berhasil diajukan untuk persetujuan.',
                    ),
                  ),
                );
              }
            },
            child: const Text('Ajukan Lembur'),
          ),
        ],
      ),
    );
  }

  void _showApplicationForm({
    required BuildContext context,
    required String title,
    required String subtitle,
    required String hint,
    bool isLeave = false,
  }) {
    DateTime selectedDate = DateTime.now();
    final reasonController = TextEditingController();

    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          return AlertDialog(
            title: Text(title),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subtitle,
                    style: Theme.of(dialogCtx).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    leading: const Icon(Icons.calendar_month),
                    title: Text(
                      'Tanggal: ${DateFormat('dd MMMM yyyy', 'id_ID').format(selectedDate)}',
                    ),
                    subtitle: const Text('Ketuk untuk memilih tanggal'),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: dialogCtx,
                        initialDate: selectedDate,
                        firstDate: DateTime.now().subtract(
                          const Duration(days: 7),
                        ),
                        lastDate: DateTime.now().add(const Duration(days: 60)),
                      );
                      if (picked != null) {
                        setDialogState(() => selectedDate = picked);
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: reasonController,
                    decoration: InputDecoration(
                      labelText: 'Keterangan',
                      hintText: hint,
                      border: const OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogCtx).pop(),
                child: const Text('Batal'),
              ),
              FilledButton(
                onPressed: () async {
                  final reason = reasonController.text.trim();
                  final messenger = ScaffoldMessenger.of(context);
                  Navigator.of(dialogCtx).pop();
                  await _submitServiceRequest(
                    type: isLeave
                        ? 'annual_leave'
                        : title.contains('Sakit')
                        ? 'sick_leave'
                        : 'permission',
                    reason: reason.isEmpty ? title : reason,
                    date: DateFormat('yyyy-MM-dd').format(selectedDate),
                  );
                  if (mounted) {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text('$title berhasil diajukan ke Admin.'),
                      ),
                    );
                  }
                },
                child: const Text('Kirim Pengajuan'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          color: _canApplyAnnualLeave
              ? colors.primaryContainer.withAlpha(120)
              : colors.surfaceContainerHighest,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Sisa Cuti Tahunan',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Chip(
                      label: Text(_canApplyAnnualLeave ? '12 Hari' : '0 Hari'),
                      backgroundColor: _canApplyAnnualLeave
                          ? colors.primary
                          : Colors.grey.shade400,
                      labelStyle: TextStyle(
                        color: _canApplyAnnualLeave
                            ? colors.onPrimary
                            : Colors.black87,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  _canApplyAnnualLeave
                      ? 'Hak cuti 12 hari/tahun aktif untuk periode kalender 2026. '
                            'Akhir pekan dan libur nasional tidak memotong saldo.'
                      : 'Masa kerja Anda belum mencapai 1 tahun (Mulai: ${widget.profile.employmentStartDate}). '
                            'Sesuai aturan perusahaan, gunakan opsi Izin untuk ketidakhadiran.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
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
                subtitle: 'Min. H-1',
                color: colors.primary,
                onTap: () => _showLeaveDialog(context),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ServiceActionCard(
                icon: Icons.local_hospital_outlined,
                title: 'Izin Sakit',
                subtitle: 'Maks. H+3',
                color: Colors.teal.shade700,
                onTap: () => _showSickLeaveDialog(context),
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
                onTap: () => _showOvertimeDialog(context),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ServiceActionCard(
                icon: Icons.assignment_outlined,
                title: 'Izin Khusus',
                subtitle: 'Keperluan pribadi',
                color: colors.secondary,
                onTap: () => _showPermissionDialog(context),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          'Status Permohonan Terkini',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: colors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
          stream: (() {
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
            final docs = snapshot.data?.docs ?? [];
            if (docs.isEmpty) {
              return Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    vertical: 24,
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
                        'Pengajuan lembur, izin, atau cuti yang Anda kirimkan akan muncul statusnya di sini.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              );
            }

            return Column(
              children: docs.map((doc) {
                final data = doc.data();
                final type = data['type'] as String? ?? 'permission';
                final status = data['status'] as String? ?? 'pending';
                final date = data['date'] as String? ?? '';
                final reason = data['reason'] as String? ?? '';

                final typeTitle = type == 'annual_leave'
                    ? 'Cuti Tahunan'
                    : type == 'sick_leave'
                    ? 'Izin Sakit'
                    : type == 'overtime'
                    ? 'Lembur'
                    : 'Izin Khusus';

                final statusColor = status == 'approved'
                    ? Colors.green
                    : status == 'rejected'
                    ? Colors.red
                    : Colors.amber.shade800;

                final statusLabel = status == 'approved'
                    ? 'Disetujui'
                    : status == 'rejected'
                    ? 'Ditolak'
                    : 'Menunggu Persetujuan';

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
                    leading: CircleAvatar(
                      backgroundColor: colors.primaryContainer.withAlpha(80),
                      child: Icon(
                        type == 'annual_leave'
                            ? Icons.beach_access
                            : type == 'sick_leave'
                            ? Icons.local_hospital
                            : type == 'overtime'
                            ? Icons.more_time
                            : Icons.assignment,
                        color: colors.primary,
                        size: 20,
                      ),
                    ),
                    title: Text(
                      typeTitle,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Text(
                      'Tanggal: $date | $reason',
                      style: theme.textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Chip(
                      label: Text(statusLabel),
                      labelStyle: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                      ),
                      backgroundColor: statusColor.withAlpha(25),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                );
              }).toList(),
            );
          },
        ),
      ],
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
