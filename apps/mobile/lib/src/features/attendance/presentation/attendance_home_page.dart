import 'package:attendance/src/features/attendance/data/attendance_history_provider.dart';
import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/attendance/application/attendance_submission_providers.dart';
import 'package:attendance/src/features/attendance/application/location_error_message.dart';
import 'package:attendance/src/features/attendance/application/location_providers.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:attendance/src/features/attendance/presentation/attendance_history_tab_view.dart';
import 'package:attendance/src/features/attendance/presentation/camera_selfie_dialog.dart';
import 'package:attendance/src/features/attendance/presentation/field_attendance_note_dialog.dart';
import 'package:attendance/src/features/auth/application/auth_error_message.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:attendance/src/features/profile/presentation/profile_tab_view.dart';
import 'package:attendance/src/features/services/presentation/services_tab_view.dart';
import 'package:flutter/material.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

class AttendanceHomePage extends ConsumerStatefulWidget {
  const AttendanceHomePage({
    required this.session,
    required this.profile,
    super.key,
  });

  final AuthSession session;
  final EmployeeProfile profile;

  @override
  ConsumerState<AttendanceHomePage> createState() => _AttendanceHomePageState();
}

class _AttendanceHomePageState extends ConsumerState<AttendanceHomePage> {
  LocationReadiness? _locationReadiness;
  String? _locationError;
  bool _checkingLocation = false;
  int _lowAccuracySamples = 0;
  AttendanceSubmissionResult? _lastSubmission;
  bool _isSubmitting = false;
  AttendanceSubmissionCommand? _pendingCommand;
  int _selectedTabIndex = 0;

  @override
  Widget build(BuildContext context) {
    ref.watch(attendanceHistoryProvider(widget.profile.uid));
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    final date = DateFormat('EEEE, d MMMM y', 'id_ID').format(now);
    final officeLocation = ref.watch(primaryOfficeLocationProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _selectedTabIndex == 0
              ? 'Kehadiran'
              : _selectedTabIndex == 1
              ? 'Layanan Karyawan'
              : _selectedTabIndex == 2
              ? 'Riwayat Presensi'
              : 'Profil Karyawan',
        ),
        actions: [
          IconButton(
            tooltip: 'Pengaturan profil',
            onPressed: () => setState(() => _selectedTabIndex = 3),
            icon: const Icon(Icons.settings_outlined),
          ),
          IconButton(
            tooltip: 'Keluar',
            onPressed: () => _signOut(context, ref),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: IndexedStack(
          index: _selectedTabIndex,
          children: [
            _buildAttendanceTab(context, now, date, officeLocation),
            ServicesTabView(profile: widget.profile),
            AttendanceHistoryTabView(profile: widget.profile),
            ProfileTabView(session: widget.session, profile: widget.profile),
          ],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        key: const Key('main-navigation-bar'),
        selectedIndex: _selectedTabIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedTabIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.alarm_outlined),
            selectedIcon: Icon(Icons.alarm),
            label: 'Kehadiran',
          ),
          NavigationDestination(
            icon: Icon(Icons.work_history_outlined),
            selectedIcon: Icon(Icons.work_history),
            label: 'Layanan',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'Riwayat',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profil',
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceTab(
    BuildContext context,
    DateTime now,
    String date,
    AsyncValue<OfficeLocation> officeLocation,
  ) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Selamat datang, ${widget.profile.fullName}',
          style: Theme.of(context).textTheme.headlineSmall
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(date, style: Theme.of(context).textTheme.bodyMedium),
        const SizedBox(height: 4),
        Text(
          '${widget.profile.employeeId} • ${widget.session.role.label}',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 20),
        _buildLocationCard(context, officeLocation),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  DateFormat('HH:mm').format(now),
                  style: Theme.of(context).textTheme.displaySmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                _buildAttendanceStatusLabel(context),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    key: const Key('check-in-button'),
                    onPressed: _canCheckIn
                        ? () => _handleAttendanceAction('check_in')
                        : null,
                    icon: _isSubmitting
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.login),
                    label: const Text('Absen Masuk'),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    key: const Key('check-out-button'),
                    onPressed: _canCheckOut
                        ? () => _handleAttendanceAction('check_out')
                        : null,
                    icon: const Icon(Icons.logout),
                    label: const Text('Absen Keluar'),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          'Informasi Sistem',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        const _StatusTile(
          icon: Icons.cloud_off_outlined,
          title: 'Antrean offline',
          subtitle: 'Belum tersedia. Gunakan koneksi internet saat absen.',
        ),
        if (AppConfig.useFirebaseEmulators) ...[
          const SizedBox(height: 12),
          _StatusTile(
            icon: Icons.developer_mode_outlined,
            title: 'Firebase development',
            subtitle:
                'Auth ${AppConfig.firebaseEmulatorHost}:'
                '${AppConfig.authEmulatorPort} • Firestore '
                '${AppConfig.firebaseEmulatorHost}:'
                '${AppConfig.firestoreEmulatorPort}',
          ),
        ],
        const SizedBox(height: 12),
        _StatusTile(
          icon: Icons.badge_outlined,
          title: 'Profil karyawan',
          subtitle:
              '${widget.profile.employmentStatus.label} • Mulai '
              '${widget.profile.employmentStartDate}',
          onTap: () => setState(() => _selectedTabIndex = 3),
        ),
      ],
    );
  }

  Widget _buildLocationCard(
    BuildContext context,
    AsyncValue<OfficeLocation> officeLocation,
  ) {
    final theme = Theme.of(context);
    final result = _locationReadiness;
    final (icon, title, description, color) = _locationPresentation(
      context,
      officeLocation,
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(description, style: theme.textTheme.bodySmall),
            if (_locationError != null) ...[
              const SizedBox(height: 8),
              Text(
                _locationError!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonalIcon(
                key: const Key('check-location-button'),
                onPressed: _checkingLocation
                    ? null
                    : officeLocation.valueOrNull == null
                    ? null
                    : () => _checkLocation(officeLocation.requireValue),
                icon: _checkingLocation
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.my_location),
                label: Text(
                  result == null
                      ? 'Periksa Lokasi'
                      : result.status == LocationReadinessStatus.retryAccuracy
                      ? 'Coba ambil lokasi lagi'
                      : 'Periksa ulang lokasi',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  (IconData, String, String, Color) _locationPresentation(
    BuildContext context,
    AsyncValue<OfficeLocation> officeLocation,
  ) {
    final colors = Theme.of(context).colorScheme;
    if (officeLocation.isLoading) {
      return (
        Icons.location_searching,
        'Memuat konfigurasi kantor',
        'Menyiapkan batas lokasi presensi yang dikelola sistem.',
        colors.primary,
      );
    }
    if (officeLocation.hasError) {
      return (
        Icons.location_off_outlined,
        'Konfigurasi lokasi tidak tersedia',
        LocationErrorMessage.from(officeLocation.error!),
        colors.error,
      );
    }

    final office = officeLocation.requireValue;
    final result = _locationReadiness;
    if (result == null) {
      return (
        Icons.location_on_outlined,
        'Lokasi presensi belum diperiksa',
        'Klik "Periksa Lokasi" untuk verifikasi',
        colors.primary,
      );
    }

    final accuracy = result.sample.accuracyMeters.toStringAsFixed(0);
    final distance = _formatMeters(result.distanceMeters);
    return switch (result.status) {
      LocationReadinessStatus.office => (
        Icons.verified_outlined,
        'Lokasi kantor terverifikasi',
        'Jarak sekitar $distance dengan akurasi ±$accuracy m. '
            'Presensi dapat dilanjutkan.',
        Colors.green.shade700,
      ),
      LocationReadinessStatus.field => (
        Icons.business_center_outlined,
        'Lokasi presensi lapangan',
        result.lowAccuracy
            ? 'Akurasi tetap rendah (±$accuracy m). Presensi diperlakukan sebagai '
                  'lapangan, ditandai lowAccuracy, dan catatan wajib.'
            : 'Jarak sekitar $distance dari kantor. Catatan lokasi/kegiatan wajib '
                  'pada tahap presensi.',
        colors.tertiary,
      ),
      LocationReadinessStatus.retryAccuracy => (
        Icons.gps_not_fixed,
        'Akurasi GPS belum memadai',
        'Akurasi ±$accuracy m, melebihi batas '
            '${office.accuracyThresholdMeters.toStringAsFixed(0)} m. '
            'Pindah ke area terbuka lalu ambil lokasi sekali lagi.',
        Colors.orange.shade800,
      ),
      LocationReadinessStatus.mockBlocked => (
        Icons.gpp_bad_outlined,
        'Presensi diblokir: lokasi mock terdeteksi',
        'Login dan dashboard tetap dapat digunakan, tetapi seluruh aksi presensi '
            'dinonaktifkan. Matikan aplikasi lokasi palsu lalu ambil sampel baru.',
        colors.error,
      ),
    };
  }

  Future<void> _checkLocation(OfficeLocation office) async {
    if (_checkingLocation) return;
    setState(() {
      _checkingLocation = true;
      _locationError = null;
    });

    try {
      final sample = await ref
          .read(deviceLocationServiceProvider)
          .captureCurrentLocation();
      if (!mounted) return;

      final result = LocationReadinessPolicy.evaluate(
        office: office,
        sample: sample,
        allowLowAccuracyFallback: _lowAccuracySamples >= 1,
      );
      setState(() {
        _locationReadiness = result;
        _checkingLocation = false;
        _locationError = null;
        _lowAccuracySamples =
            result.status == LocationReadinessStatus.retryAccuracy ? 1 : 0;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _checkingLocation = false;
        _locationError = LocationErrorMessage.from(error);
      });
    }
  }

  String _formatMeters(double meters) {
    if (meters < 1000) return '${meters.round()} m';
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  AttendanceSubmissionResult? get _todaySubmission {
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    final candidates =
        [
            ?_lastSubmission,
            ...?ref
                .read(attendanceHistoryProvider(widget.profile.uid))
                .valueOrNull
                ?.map((e) => e.result),
          ].where((event) {
            final time = DateTime.parse(event.capturedAt)
                .toUtc()
                .add(const Duration(hours: 7));
            return time.year == now.year &&
                time.month == now.month &&
                time.day == now.day;
          }).toList()
          ..sort(
            (a, b) =>
                DateTime.parse(b.capturedAt)
                    .compareTo(DateTime.parse(a.capturedAt)),
          );
    return candidates.isEmpty ? null : candidates.first;
  }

  bool get _historyReady =>
      ref.read(attendanceHistoryProvider(widget.profile.uid)).hasValue;
  bool get _canCheckIn =>
      !_isSubmitting &&
      _historyReady &&
      _todaySubmission == null &&
      _locationReadiness?.canAttend == true;
  bool get _canCheckOut =>
      !_isSubmitting &&
      _historyReady &&
      _todaySubmission?.eventType == 'check_in' &&
      _locationReadiness?.canAttend == true;

  Widget _buildAttendanceStatusLabel(BuildContext context) {
    final submission = _todaySubmission;
    if (!_historyReady) return const Text("Memuat status kehadiran...");
    if (submission == null) {
      return const Text('Belum ada presensi hari ini');
    }

    final isCheckIn = submission.eventType == 'check_in';
    final statusText = isCheckIn
        ? 'Presensi masuk tercatat'
        : 'Presensi pulang tercatat';
    final badgeColor = submission.requiresApproval
        ? Colors.amber.shade800
        : Colors.green.shade700;
    final badgeLabel = switch (submission.status) {
      AttendanceSubmissionStatus.late => 'Terlambat',
      AttendanceSubmissionStatus.earlyDeparture => 'Pulang Awal',
      AttendanceSubmissionStatus.nonWorkingDay => 'Luar Hari Kerja',
      AttendanceSubmissionStatus.normal => 'Tepat Waktu',
    };

    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      children: [
        Text(statusText, style: const TextStyle(fontWeight: FontWeight.w600)),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: badgeColor.withAlpha(30),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: badgeColor),
          ),
          child: Text(
            badgeLabel,
            style: TextStyle(
              color: badgeColor,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _handleAttendanceAction(String eventType) async {
    final readiness = _locationReadiness;
    if (readiness == null || !readiness.canAttend) return;
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);
    try {
      if (_pendingCommand?.eventType != eventType) _pendingCommand = null;
      if (_pendingCommand == null) {
        String? note;
        if (readiness.status == LocationReadinessStatus.field ||
            readiness.lowAccuracy) {
          note = await FieldAttendanceNoteDialog.show(context);
          if (!mounted || note == null) return;
        }
        final photoBase64 = await CameraSelfieDialog.show(context);
        if (!mounted || photoBase64 == null) return;
        _pendingCommand = AttendanceSubmissionCommand(
          eventType: eventType,
          capturedAt: DateTime.now().toUtc(),
          latitude: readiness.sample.latitude,
          longitude: readiness.sample.longitude,
          accuracyMeters: readiness.sample.accuracyMeters,
          locationType: readiness.status == LocationReadinessStatus.office
              ? 'office'
              : 'field',
          idempotencyKey: const Uuid().v4(),
          photoBase64: photoBase64,
          note: note,
          isMocked: readiness.sample.isMocked,
        );
      }
      final command = _pendingCommand!;
      final result = await ref
          .read(attendanceSubmissionRepositoryProvider)
          .submitAttendance(command);

      if (!mounted) return;
      setState(() {
        _lastSubmission = result;
        _pendingCommand = null;
        _isSubmitting = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.message),
          backgroundColor: result.requiresApproval
              ? Colors.amber.shade900
              : Colors.green.shade800,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      final rejected =
          e is FirebaseFunctionsException &&
          [
            'invalid-argument',
            'failed-precondition',
            'permission-denied',
          ].contains(e.code);
      if (rejected) _pendingCommand = null;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            rejected
                ? (e.message ??
                      'Absen ditolak. Periksa data lalu coba kembali.')
                : 'Absen belum terkonfirmasi. Periksa koneksi lalu ketuk tombol absen untuk mencoba kiriman yang sama.',
          ),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(authRepositoryProvider).signOut();
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(AuthErrorMessage.from(error))));
    }
  }
}

class _StatusTile extends StatelessWidget {
  const _StatusTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
