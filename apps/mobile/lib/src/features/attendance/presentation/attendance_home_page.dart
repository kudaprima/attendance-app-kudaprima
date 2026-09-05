import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/attendance/application/attendance_submission_providers.dart';
import 'package:attendance/src/features/attendance/application/location_error_message.dart';
import 'package:attendance/src/features/attendance/application/location_providers.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:attendance/src/features/attendance/domain/office_location.dart';
import 'package:attendance/src/features/attendance/presentation/camera_selfie_dialog.dart';
import 'package:attendance/src/features/attendance/presentation/field_attendance_note_dialog.dart';
import 'package:attendance/src/features/auth/application/auth_error_message.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:flutter/material.dart';
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

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final date = DateFormat('EEEE, d MMMM y', 'id_ID').format(now);
    final officeLocation = ref.watch(primaryOfficeLocationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('PT Kuda Prima'),
        actions: [
          IconButton(
            tooltip: 'Pengaturan profil',
            onPressed: () => _showDevelopmentMessage(context),
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
        child: ListView(
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
                        label: const Text('Presensi masuk'),
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
                        label: const Text('Presensi pulang'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const _StatusTile(
              icon: Icons.cloud_off_outlined,
              title: 'Antrean offline',
              subtitle: '0 event menunggu sinkronisasi',
            ),
            if (AppConfig.useFirebaseEmulators)
              _StatusTile(
                icon: Icons.developer_mode_outlined,
                title: 'Firebase development',
                subtitle:
                    'Auth ${AppConfig.firebaseEmulatorHost}:'
                    '${AppConfig.authEmulatorPort} • Firestore '
                    '${AppConfig.firebaseEmulatorHost}:'
                    '${AppConfig.firestoreEmulatorPort}',
              ),
            _StatusTile(
              icon: Icons.badge_outlined,
              title: 'Profil karyawan',
              subtitle:
                  '${widget.profile.employmentStatus.label} • Mulai '
                  '${widget.profile.employmentStartDate}',
            ),
          ],
        ),
      ),
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
                      ? 'Periksa lokasi'
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
        '${office.name} memakai radius ${office.radiusMeters.toStringAsFixed(0)} meter. '
            'Lokasi hanya diambil saat tombol ditekan.',
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

  bool get _canCheckIn {
    if (_isSubmitting) return false;
    if (_lastSubmission != null && _lastSubmission!.eventType == 'check_in') {
      return false;
    }
    return _locationReadiness?.canAttend == true;
  }

  bool get _canCheckOut {
    if (_isSubmitting) return false;
    if (_lastSubmission == null || _lastSubmission!.eventType != 'check_in') {
      return false;
    }
    return _locationReadiness?.canAttend == true;
  }

  Widget _buildAttendanceStatusLabel(BuildContext context) {
    final submission = _lastSubmission;
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
    final badgeLabel = submission.requiresApproval
        ? (submission.status == AttendanceSubmissionStatus.late
              ? 'Terlambat'
              : 'Pulang Awal')
        : 'Tepat Waktu';

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

    String? note;
    if (readiness.status == LocationReadinessStatus.field ||
        readiness.lowAccuracy) {
      note = await FieldAttendanceNoteDialog.show(context);
      if (!mounted) return;
      if (note == null) return;
    }

    final photoBase64 = await CameraSelfieDialog.show(context);
    if (!mounted) return;
    if (photoBase64 == null) return;

    setState(() => _isSubmitting = true);
    try {
      final command = AttendanceSubmissionCommand(
        eventType: eventType,
        capturedAt: DateTime.now(),
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

      final result = await ref
          .read(attendanceSubmissionRepositoryProvider)
          .submitAttendance(command);

      if (!mounted) return;
      setState(() {
        _lastSubmission = result;
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
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mengirim presensi: $e'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  void _showDevelopmentMessage(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          AppConfig.useFirebaseEmulators
              ? 'Auth dan Firestore Emulator dikonfigurasi untuk development.'
              : 'Pengaturan profil tersedia pada tahap berikutnya.',
        ),
      ),
    );
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
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
