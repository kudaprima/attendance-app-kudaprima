import 'package:attendance/src/features/auth/application/auth_error_message.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/domain/employee_profile.dart';
import 'package:attendance/src/features/profile/presentation/edit_contact_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProfileTabView extends ConsumerWidget {
  const ProfileTabView({
    required this.session,
    required this.profile,
    super.key,
  });

  final AuthSession session;
  final EmployeeProfile profile;

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Konfirmasi Keluar'),
        content: const Text('Apakah Anda yakin ingin keluar dari akun ini?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ref.read(authRepositoryProvider).signOut();
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(AuthErrorMessage.from(error))));
    }
  }

  void _showQrCodeDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Unduh Aplikasi Presensi'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.qr_code_scanner,
                    size: 140,
                    color: Theme.of(ctx).colorScheme.primary,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Pindai QR untuk mengunduh APK terbaru',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Aplikasi didistribusikan langsung tanpa Play Store. Pastikan opsi "Izinkan instalasi dari sumber tidak dikenal" aktif di ponsel Android Anda.',
              style: Theme.of(ctx).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  void _checkUpdate(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Aplikasi sudah menggunakan versi terbaru (v1.0.0).'),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: colors.primary,
                  foregroundColor: colors.onPrimary,
                  child: Text(
                    profile.fullName.isNotEmpty
                        ? profile.fullName.substring(0, 1).toUpperCase()
                        : 'K',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      color: colors.onPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  profile.fullName,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Text(
                  '${profile.employeeId} • ${profile.role.label}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Chip(
                  label: Text('Karyawan ${profile.employmentStatus.label}'),
                  backgroundColor: colors.secondaryContainer,
                  labelStyle: TextStyle(
                    color: colors.onSecondaryContainer,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Informasi Kepegawaian',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: colors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.badge_outlined),
                title: const Text('Jabatan'),
                subtitle: Text(profile.jobTitleLabel),
              ),
              if (profile.jobTitle.trim().isEmpty)
                const ListTile(
                  subtitle: Text(
                    'Hubungi Admin untuk melengkapi Jabatan Anda.',
                  ),
                ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.email_outlined),
                title: const Text('Email Perusahaan'),
                subtitle: Text(profile.email),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.calendar_today_outlined),
                title: const Text('Mulai Bekerja'),
                subtitle: Text(profile.employmentStartDate),
              ),
              const Divider(height: 1),
              const ListTile(
                leading: Icon(Icons.business_outlined),
                title: Text('Penempatan Kantor'),
                subtitle: Text('Kantor PT Kuda Prima Jakarta'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Kontak & Domisili',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: colors.onSurfaceVariant,
              ),
            ),
            TextButton.icon(
              onPressed: () => EditContactDialog.show(context, profile),
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: const Text('Ubah'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.phone_outlined),
                title: const Text('Nomor Telepon'),
                subtitle: Text(
                  profile.phone != null && profile.phone!.isNotEmpty
                      ? profile.phone!
                      : 'Belum diatur (Tekan Ubah)',
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.home_outlined),
                title: const Text('Alamat Domisili'),
                subtitle: Text(
                  profile.homeAddress != null && profile.homeAddress!.isNotEmpty
                      ? profile.homeAddress!
                      : 'Belum diatur (Tekan Ubah)',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Aplikasi & Distribusi',
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w700,
            color: colors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.android_outlined),
                title: const Text('Versi Aplikasi'),
                subtitle: const Text('v1.0.0 • Android Sideloaded APK'),
                trailing: TextButton(
                  onPressed: () => _checkUpdate(context),
                  child: const Text('Cek Update'),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.qr_code_outlined),
                title: const Text('QR Code Download APK'),
                subtitle: const Text(
                  'Bagikan aplikasi ke sesama rekan teknisi',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _showQrCodeDialog(context),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            key: const Key('profile-sign-out-button'),
            onPressed: () => _signOut(context, ref),
            icon: const Icon(Icons.logout),
            label: const Text('Keluar dari Akun'),
            style: OutlinedButton.styleFrom(
              foregroundColor: colors.error,
              side: BorderSide(color: colors.error),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}
