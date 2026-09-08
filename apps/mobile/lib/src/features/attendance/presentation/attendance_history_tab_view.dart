import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AttendanceHistoryTabView extends StatelessWidget {
  const AttendanceHistoryTabView({required this.profile, super.key});

  final EmployeeProfile profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final now = DateTime.now();
    final monthName = DateFormat('MMMM yyyy', 'id_ID').format(now);

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Ringkasan Kehadiran',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Chip(
                      label: Text(monthName),
                      backgroundColor: colors.secondaryContainer,
                      labelStyle: TextStyle(
                        color: colors.onSecondaryContainer,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _StatItem(label: 'Total Hadir', value: '1', color: colors.primary),
                    _StatItem(label: 'Tepat Waktu', value: '1', color: Colors.green.shade700),
                    _StatItem(label: 'Terlambat', value: '0', color: colors.secondary),
                    _StatItem(label: 'Lapangan', value: '1', color: colors.tertiary),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Aktivitas Presensi Terbaru',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: colors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: colors.primary.withAlpha(30),
              foregroundColor: colors.primary,
              child: const Icon(Icons.login),
            ),
            title: Text(
              DateFormat('EEEE, dd MMMM yyyy', 'id_ID').format(now),
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.schedule, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      'Masuk: ${DateFormat('HH:mm').format(now)} WIB',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 14, color: colors.tertiary),
                    const SizedBox(width: 4),
                    const Text('Presensi Lapangan', style: TextStyle(fontSize: 12)),
                  ],
                ),
              ],
            ),
            trailing: Chip(
              label: const Text('Tepat Waktu'),
              backgroundColor: Colors.green.shade50,
              side: BorderSide(color: Colors.green.shade200),
              labelStyle: TextStyle(
                color: Colors.green.shade800,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
