import 'package:attendance/src/features/attendance/presentation/attendance_home_page.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/domain/auth_session.dart';
import 'package:attendance/src/features/profile/application/profile_error_message.dart';
import 'package:attendance/src/features/profile/application/profile_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EmployeeProfileGate extends ConsumerWidget {
  const EmployeeProfileGate({required this.session, super.key});

  final AuthSession session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(employeeProfileProvider(session.uid));

    return profile.when(
      loading: () => const _ProfileLoadingPage(),
      error: (error, stackTrace) => _ProfileBlockedPage(
        title: 'Profil tidak dapat dibaca',
        message: ProfileErrorMessage.from(error),
      ),
      data: (value) {
        if (value == null) {
          return const _ProfileBlockedPage(
            title: 'Profil belum tersedia',
            message: 'Akun sudah terautentikasi tetapi belum diprovisikan oleh admin.',
          );
        }
        if (!value.active) {
          return const _ProfileBlockedPage(
            title: 'Akun dinonaktifkan',
            message: 'Hubungi admin PT Kuda Prima untuk pemeriksaan akun.',
          );
        }
        if (value.role != session.role ||
            value.email.toLowerCase() != session.email.toLowerCase()) {
          return const _ProfileBlockedPage(
            title: 'Data akun tidak konsisten',
            message: 'Role atau email Auth tidak cocok dengan profil karyawan.',
          );
        }

        return AttendanceHomePage(session: session, profile: value);
      },
    );
  }
}

class _ProfileLoadingPage extends StatelessWidget {
  const _ProfileLoadingPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(child: Center(child: CircularProgressIndicator())),
    );
  }
}

class _ProfileBlockedPage extends ConsumerStatefulWidget {
  const _ProfileBlockedPage({required this.title, required this.message});

  final String title;
  final String message;

  @override
  ConsumerState<_ProfileBlockedPage> createState() =>
      _ProfileBlockedPageState();
}

class _ProfileBlockedPageState extends ConsumerState<_ProfileBlockedPage> {
  bool _isSigningOut = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.badge_outlined, size: 52),
                  const SizedBox(height: 16),
                  Text(
                    widget.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(widget.message, textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _isSigningOut ? null : _signOut,
                    child: Text(
                      _isSigningOut ? 'Memproses...' : 'Keluar dari akun',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _signOut() async {
    setState(() => _isSigningOut = true);
    try {
      await ref.read(authRepositoryProvider).signOut();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal keluar. Silakan coba kembali.')),
      );
    } finally {
      if (mounted) setState(() => _isSigningOut = false);
    }
  }
}
