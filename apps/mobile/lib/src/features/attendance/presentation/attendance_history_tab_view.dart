import 'package:attendance/src/core/theme/app_colors.dart';
import 'package:attendance/src/features/attendance/data/attendance_history_provider.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/presentation/widgets/attendance_detail_bottom_sheet.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class AttendanceHistoryTabView extends ConsumerStatefulWidget {
  const AttendanceHistoryTabView({required this.profile, super.key});
  final EmployeeProfile profile;
  @override
  ConsumerState<AttendanceHistoryTabView> createState() =>
      _AttendanceHistoryTabViewState();
}

class _AttendanceHistoryTabViewState
    extends ConsumerState<AttendanceHistoryTabView> {
  DateTime? _selectedMonth;
  DateTimeRange? _selectedDateRange;

  bool get _isFiltered => _selectedMonth != null || _selectedDateRange != null;

  void _clearFilter() {
    setState(() {
      _selectedMonth = null;
      _selectedDateRange = null;
    });
  }

  Future<void> _pickDateRange(BuildContext context, DateTime now) async {
    final initialRange =
        _selectedDateRange ??
        DateTimeRange(start: DateTime(now.year, now.month, 1), end: now);

    final picked = await showDateRangePicker(
      context: context,
      initialDateRange: initialRange,
      firstDate: DateTime(2025, 1, 1),
      lastDate: DateTime(now.year + 1, 12, 31),
      helpText: 'Pilih Rentang Tanggal',
      cancelText: 'Batal',
      confirmText: 'Terapkan',
      saveText: 'Terapkan',
    );

    if (picked != null) {
      setState(() {
        _selectedDateRange = picked;
        _selectedMonth = null;
      });
    }
  }

  Future<void> _pickMonth(BuildContext context, DateTime now) async {
    int tempYear = _selectedMonth?.year ?? now.year;
    int tempMonth = _selectedMonth?.month ?? now.month;

    final picked = await showModalBottomSheet<DateTime>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            const months = [
              'Januari',
              'Februari',
              'Maret',
              'April',
              'Mei',
              'Juni',
              'Juli',
              'Agustus',
              'September',
              'Oktober',
              'November',
              'Desember',
            ];

            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Pilih Bulan & Tahun',
                        style: Theme.of(ctx).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      Row(
                        children: [
                          IconButton(
                            key: const Key('history-prev-year-button'),
                            icon: const Icon(Icons.chevron_left_rounded),
                            onPressed: () => setModalState(() => tempYear--),
                          ),
                          Text(
                            '$tempYear',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          IconButton(
                            key: const Key('history-next-year-button'),
                            icon: const Icon(Icons.chevron_right_rounded),
                            onPressed: () => setModalState(() => tempYear++),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 2.2,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                    itemCount: 12,
                    itemBuilder: (ctx, i) {
                      final monthIndex = i + 1;
                      final isSelected = monthIndex == tempMonth;
                      return InkWell(
                        key: Key('history-month-item-$monthIndex'),
                        borderRadius: BorderRadius.circular(10),
                        onTap: () {
                          Navigator.of(ctx)
                              .pop(DateTime(tempYear, monthIndex, 1));
                        },
                        child: Container(
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).colorScheme.primaryContainer
                                      .withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            months[i],
                            style: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : Theme.of(context).colorScheme.onSurface,
                              fontWeight: isSelected
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedMonth = picked;
        _selectedDateRange = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(attendanceHistoryProvider(widget.profile.uid));
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));

    return history.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (_, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              const Text(
                'Riwayat belum dapat dimuat. Periksa koneksi.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton.tonal(
                onPressed: () => ref.invalidate(
                  attendanceHistoryProvider(widget.profile.uid),
                ),
                child: const Text('Coba Lagi'),
              ),
            ],
          ),
        ),
      ),
      data: (events) {
        // Filter events based on active selection (Month or Date Range or All)
        final List<AttendanceHistoryEntry> filteredEvents;
        final String periodLabel;

        if (_selectedMonth != null) {
          filteredEvents = events
              .where(
                (event) =>
                    event.time.year == _selectedMonth!.year &&
                    event.time.month == _selectedMonth!.month,
              )
              .toList();
          periodLabel = DateFormat(
            'MMMM yyyy',
            'id_ID',
          ).format(_selectedMonth!);
        } else if (_selectedDateRange != null) {
          filteredEvents = events.where((event) {
            final day = DateTime(
              event.time.year,
              event.time.month,
              event.time.day,
            );
            final start = DateTime(
              _selectedDateRange!.start.year,
              _selectedDateRange!.start.month,
              _selectedDateRange!.start.day,
            );
            final end = DateTime(
              _selectedDateRange!.end.year,
              _selectedDateRange!.end.month,
              _selectedDateRange!.end.day,
            );
            return (day.isAtSameMomentAs(start) || day.isAfter(start)) &&
                (day.isAtSameMomentAs(end) || day.isBefore(end));
          }).toList();
          periodLabel =
              '${DateFormat('d MMM', 'id_ID').format(_selectedDateRange!.start)} - '
              '${DateFormat('d MMM yyyy', 'id_ID').format(_selectedDateRange!.end)}';
        } else {
          filteredEvents = events;
          periodLabel = DateFormat('MMMM yyyy', 'id_ID').format(now);
        }

        // Summary calculations
        final summaryTargetEvents = _isFiltered
            ? filteredEvents
            : events
                  .where(
                    (event) =>
                        event.time.year == now.year &&
                        event.time.month == now.month,
                  )
                  .toList();

        final presentDays = summaryTargetEvents
            .where((event) => event.result.eventType == 'check_in')
            .map((event) => DateFormat('yyyy-MM-dd').format(event.time))
            .toSet();

        final lateDays = summaryTargetEvents
            .where((event) => event.status == AttendanceSubmissionStatus.late)
            .map((event) => DateFormat('yyyy-MM-dd').format(event.time))
            .toSet();

        return ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          children: [
            // Ringkasan Kehadiran (Enhanced with Terlambat days count)
            _buildSummaryCard(
              context,
              periodLabel: periodLabel,
              daysCount: presentDays.length,
              lateDaysCount: lateDays.length,
            ),
            const SizedBox(height: 16),

            // Filter Bar (Month and Date Range Pickers)
            _buildDateFilterBar(context, now),
            const SizedBox(height: 16),

            // Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _isFiltered
                      ? 'Aktivitas ($periodLabel)'
                      : 'Semua Aktivitas Presensi',
                  style: Theme.of(context).textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  '${filteredEvents.length} Catatan',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Empty States & List
            if (events.isEmpty)
              _buildEmptyState(
                context,
                title: 'Belum ada riwayat kehadiran.',
                subtitle: 'Aktivitas presensi Anda akan tercatat secara otomatis di sini.',
              )
            else if (filteredEvents.isEmpty && _isFiltered)
              _buildFilteredEmptyState(context, periodLabel)
            else
              for (final event in filteredEvents) ...[
                _buildAttendanceCard(context, event),
                const SizedBox(height: 12),
              ],
          ],
        );
      },
    );
  }

  Widget _buildSummaryCard(
    BuildContext context, {
    required String periodLabel,
    required int daysCount,
    required int lateDaysCount,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.insert_chart_outlined_rounded,
                      size: 20,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Ringkasan Kehadiran',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.primaryContainer.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    periodLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onPrimaryContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                // Total Hadir Metric
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check_circle_outline_rounded,
                            size: 18,
                            color: Color(0xFF1B5E20),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Total Hadir',
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: const Color(0xFF1B5E20),
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$daysCount Hari',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF1B5E20),
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Terlambat Metric
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E0),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.schedule_rounded,
                            size: 18,
                            color: Color(0xFFC43E00),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Terlambat',
                                style: Theme.of(context).textTheme.labelSmall
                                    ?.copyWith(
                                      color: const Color(0xFFC43E00),
                                      fontWeight: FontWeight.w600,
                                    ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '$lateDaysCount Hari',
                                style: Theme.of(context).textTheme.titleMedium
                                    ?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFFC43E00),
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDateFilterBar(BuildContext context, DateTime now) {
    final colorScheme = Theme.of(context).colorScheme;

    final String activeFilterText;
    if (_selectedMonth != null) {
      activeFilterText =
          'Bulan: ${DateFormat('MMMM yyyy', 'id_ID').format(_selectedMonth!)}';
    } else if (_selectedDateRange != null) {
      activeFilterText =
          'Rentang: ${DateFormat('d MMM', 'id_ID').format(_selectedDateRange!.start)} - '
          '${DateFormat('d MMM yyyy', 'id_ID').format(_selectedDateRange!.end)}';
    } else {
      activeFilterText = 'Semua Riwayat';
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isFiltered
              ? colorScheme.primary
              : colorScheme.outline.withValues(alpha: 0.25),
          width: _isFiltered ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.tune_rounded,
                size: 20,
                color: _isFiltered
                    ? colorScheme.primary
                    : colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Filter Riwayat',
                      style: Theme.of(context).textTheme.labelSmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                    Text(
                      activeFilterText,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: _isFiltered
                            ? FontWeight.w700
                            : FontWeight.w500,
                        color: _isFiltered
                            ? colorScheme.primary
                            : colorScheme.onSurface,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (_isFiltered)
                IconButton(
                  key: const Key('history-clear-date-filter'),
                  tooltip: 'Hapus filter',
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: _clearFilter,
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Filter options: Pilih Bulan & Rentang Tanggal
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  key: const Key('history-filter-month-button'),
                  onPressed: () => _pickMonth(context, now),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    side: BorderSide(
                      color: _selectedMonth != null
                          ? colorScheme.primary
                          : colorScheme.outline.withValues(alpha: 0.4),
                    ),
                  ),
                  icon: const Icon(Icons.calendar_month_outlined, size: 16),
                  label: const Text('Pilih Bulan'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  key: const Key('history-filter-range-button'),
                  onPressed: () => _pickDateRange(context, now),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    side: BorderSide(
                      color: _selectedDateRange != null
                          ? colorScheme.primary
                          : colorScheme.outline.withValues(alpha: 0.4),
                    ),
                  ),
                  icon: const Icon(Icons.date_range_outlined, size: 16),
                  label: const Text('Pilih Hari'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(
    BuildContext context, {
    required String title,
    required String subtitle,
  }) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            Icon(
              Icons.calendar_today_outlined,
              size: 44,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilteredEmptyState(BuildContext context, String periodLabel) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          children: [
            const Icon(
              Icons.event_busy_rounded,
              size: 44,
              color: Colors.orange,
            ),
            const SizedBox(height: 12),
            Text(
              'Tidak Ada Presensi',
              style: Theme.of(context).textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              'Tidak ditemukan aktivitas presensi pada periode $periodLabel.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.tonal(
              key: const Key('history-reset-empty-button'),
              onPressed: _clearFilter,
              child: const Text('Tampilkan Semua Riwayat'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceCard(
    BuildContext context,
    AttendanceHistoryEntry event,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final isCheckIn = event.result.eventType == 'check_in';
    final timeStr = DateFormat('HH:mm').format(event.time);
    final dateStr = DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(event.time);

    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: InkWell(
        key: Key('history-card-${event.result.eventType}'),
        onTap: () => AttendanceDetailBottomSheet.show(context, event),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isCheckIn)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      key: const Key('history-icon-check-in'),
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE8F5E9),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.login_rounded,
                        size: 20,
                        color: Color(0xFF1B5E20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Absen Masuk',
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$timeStr WIB',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildScheduleBadge(context, event.status),
                  ],
                )
              else
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    _buildScheduleBadge(context, event.status),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Absen Keluar',
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$timeStr WIB',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                  fontWeight: FontWeight.w600,
                                ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      key: const Key('history-icon-check-out'),
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: colorScheme.secondaryContainer,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.logout_rounded,
                        size: 20,
                        color: colorScheme.onSecondaryContainer,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 12),
              Divider(
                height: 1,
                thickness: 1,
                color: colorScheme.outline.withValues(alpha: 0.15),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 15,
                    color: colorScheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '$dateStr • $timeStr WIB',
                      style: Theme.of(context).textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    event.locationType == 'office'
                        ? Icons.business_outlined
                        : Icons.near_me_outlined,
                    size: 16,
                    color: event.locationType == 'office'
                        ? colorScheme.primary
                        : colorScheme.tertiary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          event.locationType == 'office'
                              ? 'Kantor Utama'
                              : 'Luar Kantor (Lapangan)',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          event.locationType == 'office'
                              ? 'Dalam radius kantor (${event.distanceMeters.toStringAsFixed(0)} m)'
                              : 'Di luar radius kantor (${event.distanceMeters.toStringAsFixed(0)} m)'
                                    '${event.accuracyMeters != null ? ' • Akurasi ±${event.accuracyMeters!.toStringAsFixed(0)} m' : ''}',
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _buildLocationTypeBadge(context, event.locationType),
                ],
              ),
              const SizedBox(height: 10),
              _buildApprovalSection(context, event),
              if (event.note != null && event.note!.trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.muted,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.edit_note_rounded,
                        size: 18,
                        color: colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Catatan: ${event.note!}',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(color: colorScheme.onSurface),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    'Lihat Detail & Peta',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 11,
                    color: colorScheme.primary,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildScheduleBadge(
    BuildContext context,
    AttendanceSubmissionStatus status,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    return switch (status) {
      AttendanceSubmissionStatus.normal => _buildBadge(
        label: 'Tepat Waktu',
        backgroundColor: const Color(0xFFE8F5E9),
        textColor: const Color(0xFF1B5E20),
        icon: Icons.check_circle_outline_rounded,
      ),
      AttendanceSubmissionStatus.late => _buildBadge(
        label: 'Terlambat',
        backgroundColor: colorScheme.secondaryContainer,
        textColor: colorScheme.onSecondaryContainer,
        icon: Icons.schedule_rounded,
      ),
      AttendanceSubmissionStatus.earlyDeparture => _buildBadge(
        label: 'Pulang Awal',
        backgroundColor: colorScheme.secondaryContainer,
        textColor: colorScheme.onSecondaryContainer,
        icon: Icons.hourglass_bottom_rounded,
      ),
      AttendanceSubmissionStatus.nonWorkingDay => _buildBadge(
        label: 'Luar Jadwal',
        backgroundColor: colorScheme.tertiaryContainer,
        textColor: colorScheme.onTertiaryContainer,
        icon: Icons.event_busy_rounded,
      ),
    };
  }

  Widget _buildLocationTypeBadge(BuildContext context, String locationType) {
    final colorScheme = Theme.of(context).colorScheme;
    if (locationType == 'office') {
      return _buildBadge(
        label: 'Kantor',
        backgroundColor: colorScheme.primaryContainer.withValues(alpha: 0.5),
        textColor: colorScheme.onPrimaryContainer,
      );
    } else {
      return _buildBadge(
        label: 'Lapangan',
        backgroundColor: colorScheme.tertiaryContainer.withValues(alpha: 0.5),
        textColor: colorScheme.onTertiaryContainer,
      );
    }
  }

  Widget _buildApprovalSection(
    BuildContext context,
    AttendanceHistoryEntry event,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final requiresApproval = event.requiresApproval;
    final approvalStatus = event.approvalStatus;

    if (!requiresApproval && approvalStatus == null) {
      return Row(
        children: [
          _buildBadge(
            label: 'Otomatis Valid',
            backgroundColor: colorScheme.primaryContainer.withValues(
              alpha: 0.4,
            ),
            textColor: colorScheme.onPrimaryContainer,
            icon: Icons.verified_outlined,
          ),
        ],
      );
    }

    Widget statusBadge;
    if (approvalStatus == 'approved') {
      statusBadge = _buildBadge(
        label: 'Disetujui',
        backgroundColor: const Color(0xFFE8F5E9),
        textColor: const Color(0xFF1B5E20),
        icon: Icons.verified_rounded,
      );
    } else if (approvalStatus == 'rejected') {
      statusBadge = _buildBadge(
        label: 'Ditolak',
        backgroundColor: colorScheme.errorContainer,
        textColor: colorScheme.onErrorContainer,
        icon: Icons.cancel_outlined,
      );
    } else {
      statusBadge = _buildBadge(
        label: 'Menunggu Persetujuan Admin',
        backgroundColor: const Color(0xFFFFF3E0),
        textColor: const Color(0xFFC43E00),
        icon: Icons.hourglass_empty_rounded,
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            statusBadge,
            if (event.approvedByName != null) ...[
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'oleh ${event.approvedByName}',
                  style: Theme.of(context).textTheme.labelSmall
                      ?.copyWith(color: colorScheme.onSurfaceVariant),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
        if (event.approvalReasons.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            'Alasan: ${event.approvalReasons.join(', ')}',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
        if (event.approvalNotes != null && event.approvalNotes!.isNotEmpty) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFFE082)),
            ),
            child: Text(
              'Catatan Admin: ${event.approvalNotes}',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: const Color(0xFF5D4037)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildBadge({
    required String label,
    required Color backgroundColor,
    required Color textColor,
    IconData? icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: textColor),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }
}
