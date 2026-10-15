import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui';

import 'package:attendance/src/core/theme/app_colors.dart';
import 'package:attendance/src/features/attendance/application/location_providers.dart';
import 'package:attendance/src/features/attendance/data/attendance_history_provider.dart';
import 'package:attendance/src/features/attendance/domain/attendance_submission.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

class AttendanceDetailBottomSheet extends ConsumerStatefulWidget {
  const AttendanceDetailBottomSheet({super.key, required this.entry});

  final AttendanceHistoryEntry entry;

  static Future<void> show(BuildContext context, AttendanceHistoryEntry entry) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => AttendanceDetailBottomSheet(entry: entry),
    );
  }

  @override
  ConsumerState<AttendanceDetailBottomSheet> createState() =>
      _AttendanceDetailBottomSheetState();
}

class _AttendanceDetailBottomSheetState
    extends ConsumerState<AttendanceDetailBottomSheet> {
  String? _resolvedPhotoUrl;
  bool _isLoadingPhoto = true;
  bool _isPhotoArchived = false;

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

  Widget _buildResolvedImage(
    String url, {
    required BoxFit fit,
    required Widget Function(BuildContext, Object, StackTrace?) errorBuilder,
  }) {
    final memoryBytes = _decodeDataUrl(url);
    if (memoryBytes != null) {
      return Image.memory(memoryBytes, fit: fit, errorBuilder: errorBuilder);
    }
    return Image.network(url, fit: fit, errorBuilder: errorBuilder);
  }

  @override
  void initState() {
    super.initState();
    _loadPhotoUrl();
  }

  Future<void> _loadPhotoUrl() async {
    final entry = widget.entry;
    if (entry.photoUrl != null && entry.photoUrl!.isNotEmpty) {
      if (mounted) {
        setState(() {
          _resolvedPhotoUrl = entry.photoUrl;
          _isLoadingPhoto = false;
        });
      }
      return;
    }

    final path = entry.photoStoragePath;
    if (path == null || path.isEmpty) {
      if (mounted) {
        setState(() {
          _isLoadingPhoto = false;
          _isPhotoArchived = true;
        });
      }
      return;
    }

    if (path.startsWith('data:image/') ||
        path.startsWith('http://') ||
        path.startsWith('https://')) {
      if (mounted) {
        setState(() {
          _resolvedPhotoUrl = path;
          _isLoadingPhoto = false;
        });
      }
      return;
    }

    try {
      if (Firebase.apps.isNotEmpty) {
        String? downloadUrl;
        try {
          downloadUrl = await FirebaseStorage.instance
              .ref(path)
              .getDownloadURL();
        } catch (_) {
          final bucket = FirebaseStorage.instance.bucket;
          final alternateBucket = bucket.contains('firebasestorage.app')
              ? bucket.replaceAll('firebasestorage.app', 'appspot.com')
              : bucket.replaceAll('appspot.com', 'firebasestorage.app');
          downloadUrl = await FirebaseStorage.instanceFor(
            bucket: alternateBucket,
          ).ref(path).getDownloadURL();
        }
        if (mounted) {
          setState(() {
            _resolvedPhotoUrl = downloadUrl;
            _isLoadingPhoto = false;
          });
        }
        return;
      }
    } catch (_) {
      // Object not found (retention expired > 3 months) or storage error
    }

    if (mounted) {
      setState(() {
        _isLoadingPhoto = false;
        _isPhotoArchived = true;
      });
    }
  }

  Future<void> _openGoogleMaps(double lat, double lng) async {
    final url = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$lat,$lng',
    );
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Tidak dapat membuka Google Maps pada perangkat ini.',
            ),
          ),
        );
      }
    }
  }

  void _showPhotoLightbox(BuildContext context, String imageUrl) {
    showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  color: Colors.black87,
                  child: InteractiveViewer(
                    minScale: 0.8,
                    maxScale: 4.0,
                    child: _buildResolvedImage(
                      imageUrl,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) =>
                          const Padding(
                            padding: EdgeInsets.all(32),
                            child: Icon(
                              Icons.broken_image_outlined,
                              size: 48,
                              color: Colors.white70,
                            ),
                          ),
                    ),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: IconButton.filledTonal(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final entry = widget.entry;
    final isCheckIn = entry.eventType == 'check_in';
    final timeStr = DateFormat('HH:mm').format(entry.time);
    final dateStr = DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(entry.time);
    final officeAsync = ref.watch(primaryOfficeLocationProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: const [
              BoxShadow(
                color: Colors.black12,
                blurRadius: 16,
                offset: Offset(0, -4),
              ),
            ],
          ),
          child: Column(
            children: [
              // Frosted Blur Drag Handle & Header
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    color: colorScheme.surface.withValues(alpha: 0.85),
                    padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
                    child: Column(
                      children: [
                        Center(
                          child: Container(
                            width: 36,
                            height: 4,
                            decoration: BoxDecoration(
                              color: colorScheme.outline.withValues(alpha: 0.3),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Text(
                              'Detail Presensi',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const Spacer(),
                            IconButton(
                              icon: const Icon(Icons.close_rounded, size: 20),
                              visualDensity: VisualDensity.compact,
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const Divider(height: 1, thickness: 1),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                  children: [
                    // Status & Time Header Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isCheckIn
                            ? const Color(0xFFE8F5E9)
                            : colorScheme.secondaryContainer,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isCheckIn
                                  ? Icons.login_rounded
                                  : Icons.logout_rounded,
                              size: 22,
                              color: isCheckIn
                                  ? const Color(0xFF1B5E20)
                                  : colorScheme.onSecondaryContainer,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isCheckIn ? 'Absen Masuk' : 'Absen Keluar',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: isCheckIn
                                        ? const Color(0xFF1B5E20)
                                        : colorScheme.onSecondaryContainer,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$dateStr • $timeStr WIB',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: isCheckIn
                                        ? const Color(0xFF1B5E20)
                                        : colorScheme.onSecondaryContainer,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _buildScheduleBadge(entry.status),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Section 1: Foto Verifikasi Wajah (Selfie)
                    _buildSectionHeader(
                      icon: Icons.photo_camera_outlined,
                      title: 'Foto Verifikasi Wajah',
                    ),
                    const SizedBox(height: 10),
                    _buildPhotoContainer(context),
                    const SizedBox(height: 24),

                    // Section 2: Visual Map via OpenStreetMap
                    _buildSectionHeader(
                      icon: Icons.map_outlined,
                      title: 'Lokasi & Koordinat Peta',
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE8F5E9),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'OpenStreetMap',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1B5E20),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildMapContainer(context, officeAsync.valueOrNull),
                    const SizedBox(height: 24),

                    // Section 3: Informasi Detail & Persetujuan
                    _buildSectionHeader(
                      icon: Icons.info_outline_rounded,
                      title: 'Rincian Validasi & Persetujuan',
                    ),
                    const SizedBox(height: 10),
                    _buildDetailInformation(context),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    Widget? trailing,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.foreground),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.foreground,
          ),
        ),
        if (trailing != null) ...[const Spacer(), trailing],
      ],
    );
  }

  Widget _buildPhotoContainer(BuildContext context) {
    if (_isLoadingPhoto) {
      return Container(
        height: 180,
        decoration: BoxDecoration(
          color: AppColors.muted,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(height: 8),
              Text(
                'Memuat foto selfie...',
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ],
          ),
        ),
      );
    }

    if (_isPhotoArchived || _resolvedPhotoUrl == null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        decoration: BoxDecoration(
          color: AppColors.muted,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          children: [
            const Icon(
              Icons.inventory_2_outlined,
              size: 36,
              color: Color(0xFF64748B),
            ),
            const SizedBox(height: 10),
            const Text(
              'Foto Telah Diarsipkan',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Sesuai kebijakan retensi PT Kuda Prima, foto selfie disimpan selama 3 bulan dan otomatis dihapus untuk efisiensi penyimpanan.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade600,
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }

    return GestureDetector(
      onTap: () => _showPhotoLightbox(context, _resolvedPhotoUrl!),
      child: Stack(
        alignment: Alignment.bottomRight,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(16),
              ),
              child: _buildResolvedImage(
                _resolvedPhotoUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: AppColors.muted,
                  child: const Center(
                    child: Text(
                      'Gagal memuat gambar',
                      style: TextStyle(fontSize: 12, color: Colors.black54),
                    ),
                  ),
                ),
              ),
            ),
          ),
          Container(
            margin: const EdgeInsets.all(10),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.zoom_in_rounded, size: 14, color: Colors.white),
                SizedBox(width: 4),
                Text(
                  'Perbesar',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapContainer(BuildContext context, dynamic primaryOffice) {
    final entry = widget.entry;
    final lat = entry.latitude;
    final lng = entry.longitude;

    if (lat == null || lng == null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.muted,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: const Center(
          child: Text(
            'Titik koordinat tidak tersedia untuk presensi ini.',
            style: TextStyle(fontSize: 12, color: Colors.black54),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Container(
            height: 220,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(16),
            ),
            child: FlutterMap(
              options: MapOptions(
                initialCenter: LatLng(lat, lng),
                initialZoom: 16.0,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
                ),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.kudaprima.attendance',
                  errorTileCallback: (tile, error, stackTrace) {},
                ),
                if (primaryOffice != null)
                  CircleLayer(
                    circles: [
                      CircleMarker(
                        point: LatLng(
                          primaryOffice.latitude as double,
                          primaryOffice.longitude as double,
                        ),
                        radius: primaryOffice.radiusMeters as double,
                        useRadiusInMeter: true,
                        color: const Color(0x261B5E20),
                        borderColor: const Color(0xFF1B5E20),
                        borderStrokeWidth: 1.5,
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: LatLng(lat, lng),
                      width: 44,
                      height: 44,
                      child: Container(
                        decoration: const BoxDecoration(
                          color: AppColors.orange,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 6,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.person_pin_circle_rounded,
                          color: Colors.white,
                          size: 26,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        // Coordinates & Metric Info
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.muted,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.location_searching_rounded,
                    size: 15,
                    color: Colors.black54,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Koordinat: ${lat.toStringAsFixed(6)}, ${lng.toStringAsFixed(6)}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.foreground,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(
                    Icons.straighten_rounded,
                    size: 15,
                    color: Colors.black54,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Jarak ke kantor: ${entry.distanceMeters.toStringAsFixed(0)} m'
                      '${entry.accuracyMeters != null ? ' • Akurasi GPS: ±${entry.accuracyMeters!.toStringAsFixed(0)} m' : ''}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => _openGoogleMaps(lat, lng),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            side: const BorderSide(color: AppColors.border),
          ),
          icon: const Icon(Icons.open_in_new_rounded, size: 16),
          label: const Text(
            'Buka di Google Maps',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailInformation(BuildContext context) {
    final entry = widget.entry;
    final isOffice = entry.locationType == 'office';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.muted,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoRow(
            icon: isOffice ? Icons.business_outlined : Icons.near_me_outlined,
            label: 'Tipe Lokasi',
            value: isOffice ? 'Kantor Utama' : 'Luar Kantor (Lapangan)',
          ),
          const Divider(height: 16, thickness: 0.8),
          _buildInfoRow(
            icon: Icons.verified_user_outlined,
            label: 'Status Persetujuan',
            valueWidget: _buildApprovalStatusBadge(entry),
          ),
          if (entry.approvalReasons.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: entry.approvalReasons
                  .map((r) => _buildReasonChip(r))
                  .toList(),
            ),
          ],
          if (entry.approvedByName != null) ...[
            const Divider(height: 16, thickness: 0.8),
            _buildInfoRow(
              icon: Icons.person_outline_rounded,
              label: 'Disetujui Oleh',
              value: entry.approvedByName!,
            ),
          ],
          if (entry.approvalNotes != null &&
              entry.approvalNotes!.trim().isNotEmpty) ...[
            const Divider(height: 16, thickness: 0.8),
            _buildInfoRow(
              icon: Icons.comment_outlined,
              label: 'Catatan Admin',
              value: entry.approvalNotes!,
            ),
          ],
          if (entry.note != null && entry.note!.trim().isNotEmpty) ...[
            const Divider(height: 16, thickness: 0.8),
            _buildInfoRow(
              icon: Icons.edit_note_rounded,
              label: 'Catatan Teknisi',
              value: entry.note!,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    String? value,
    Widget? valueWidget,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.black54),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.black54,
          ),
        ),
        const Spacer(),
        if (valueWidget != null)
          valueWidget
        else if (value != null)
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: AppColors.foreground,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildScheduleBadge(AttendanceSubmissionStatus status) {
    final (label, bg, fg) = switch (status) {
      AttendanceSubmissionStatus.normal => (
        'Tepat Waktu',
        const Color(0xFFE8F5E9),
        const Color(0xFF1B5E20),
      ),
      AttendanceSubmissionStatus.late => (
        'Terlambat',
        const Color(0xFFFFF3E0),
        const Color(0xFFC43E00),
      ),
      AttendanceSubmissionStatus.earlyDeparture => (
        'Pulang Awal',
        const Color(0xFFFFE4D8),
        const Color(0xFF641F08),
      ),
      AttendanceSubmissionStatus.nonWorkingDay => (
        'Luar Jadwal',
        const Color(0xFFEDE6F5),
        const Color(0xFF3B2B59),
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }

  Widget _buildApprovalStatusBadge(AttendanceHistoryEntry event) {
    if (!event.requiresApproval) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFFE8F5E9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text(
          'Otomatis Valid',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1B5E20),
          ),
        ),
      );
    }

    final (label, bg, fg) = switch (event.approvalStatus) {
      'approved' => (
        'Disetujui',
        const Color(0xFFE8F5E9),
        const Color(0xFF1B5E20),
      ),
      'rejected' => (
        'Ditolak',
        const Color(0xFFFFEBEE),
        const Color(0xFFC62828),
      ),
      _ => ('Menunggu Admin', const Color(0xFFE3E7FF), const Color(0xFF1C286E)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }

  Widget _buildReasonChip(String reason) {
    final readable = switch (reason) {
      'late' => 'Keterlambatan',
      'early_departure' => 'Pulang Lebih Awal',
      'non_working_day' => 'Di Luar Hari Kerja',
      'field_attendance' => 'Presensi Lapangan',
      _ => reason,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFFFFCC80)),
      ),
      child: Text(
        readable,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: Color(0xFFC43E00),
        ),
      ),
    );
  }
}
