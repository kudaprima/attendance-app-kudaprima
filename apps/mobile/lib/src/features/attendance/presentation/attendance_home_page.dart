import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/auth/application/auth_error_message.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class AttendanceHomePage extends ConsumerWidget {
  const AttendanceHomePage({required this.session, super.key});

  final AuthSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = DateTime.now();
    final date = DateFormat('EEEE, d MMMM y', 'id_ID').format(now);

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
              'Selamat datang, ${session.greetingName}',
              style: Theme.of(context).textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(date, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 4),
            Text(
              'Peran: ${session.role.label}',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.location_on_outlined),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text('Lokasi presensi belum diperiksa'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Di kantor berlaku radius 100 meter. Di luar kantor tetap boleh '
                      'presensi lapangan dengan catatan wajib.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ),
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
                    const Text('Belum ada presensi hari ini'),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () => _showDevelopmentMessage(context),
                        icon: const Icon(Icons.login),
                        label: const Text('Presensi masuk'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: null,
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
                    'Auth Emulator aktif di ${AppConfig.firebaseEmulatorHost}:'
                    '${AppConfig.authEmulatorPort}',
              ),
            const _StatusTile(
              icon: Icons.badge_outlined,
              title: 'Profil karyawan',
              subtitle: 'Lengkapi nama lengkap dan nomor telepon setelah login',
            ),
          ],
        ),
      ),
    );
  }

  void _showDevelopmentMessage(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          AppConfig.useFirebaseEmulators
              ? 'Auth Emulator aktif. Login development tersedia pada tahap berikutnya.'
              : 'Firebase siap. Login Google tersedia pada tahap berikutnya.',
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
