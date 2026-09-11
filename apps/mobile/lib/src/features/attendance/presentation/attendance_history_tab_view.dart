import 'package:attendance/src/features/attendance/data/attendance_history_provider.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class AttendanceHistoryTabView extends ConsumerWidget {
  const AttendanceHistoryTabView({required this.profile, super.key});
  final EmployeeProfile profile;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(attendanceHistoryProvider(profile.uid));
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    return history.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, _) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Riwayat belum dapat dimuat. Periksa koneksi.'),
            TextButton(
              onPressed: () =>
                  ref.invalidate(attendanceHistoryProvider(profile.uid)),
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
      data: (events) {
        final monthly = events
            .where(
              (event) =>
                  event.time.year == now.year && event.time.month == now.month,
            )
            .toList();
        final days = monthly
            .where((event) => event.result.eventType == 'check_in')
            .map((event) => DateFormat('yyyy-MM-dd').format(event.time))
            .toSet();
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Ringkasan Kehadiran',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${DateFormat('MMMM yyyy', 'id_ID').format(now)} · ${days.length} hari hadir',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Aktivitas Presensi Terbaru',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            if (events.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('Belum ada riwayat kehadiran.'),
                ),
              ),
            for (final event in events)
              Card(
                child: ListTile(
                  leading: Icon(
                    event.result.eventType == 'check_in'
                        ? Icons.login
                        : Icons.logout,
                  ),
                  title: Text(
                    event.result.eventType == 'check_in'
                        ? 'Absen Masuk'
                        : 'Absen Keluar',
                  ),
                  subtitle: Text(
                    '${DateFormat('dd MMM yyyy, HH:mm', 'id_ID').format(event.time)} WIB\n'
                    '${event.result.locationType == 'office' ? 'Kantor' : 'Lapangan'}'
                    '${event.note == null ? '' : '\n${event.note}'}'
                    '${event.result.requiresApproval ? '\nMemerlukan persetujuan' : ''}',
                  ),
                  isThreeLine: true,
                ),
              ),
          ],
        );
      },
    );
  }
}
