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
          return _ProfileBlockedPage(
            title: 'Akun dinonaktifkan',
            message:
                'Akun Anda (${value.email}) berstatus nonaktif atau sedang menunggu persetujuan Admin PT Kuda Prima.\n\nDemi keamanan data perusahaan, akun ini memerlukan aktivasi dari Admin sebelum dapat digunakan untuk presensi.',
            isPendingApproval: true,
            uid: session.uid,
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
  const _ProfileBlockedPage({
    required this.title,
    required this.message,
    this.isPendingApproval = false,
    this.uid,
  });

  final String title;
  final String message;
  final bool isPendingApproval;
  final String? uid;

  @override
  ConsumerState<_ProfileBlockedPage> createState() =>
      _ProfileBlockedPageState();
}

class _ProfileBlockedPageState extends ConsumerState<_ProfileBlockedPage> {
  bool _isSigningOut = false;
  bool _isRefreshing = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    widget.isPendingApproval
                        ? Icons.hourglass_top_rounded
                        : Icons.badge_outlined,
                    size: 56,
                    color: widget.isPendingApproval
                        ? const Color(0xFFF25923)
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.message,
                    textAlign: TextAlign.center,
                    style: const TextStyle(height: 1.5),
                  ),
                  const SizedBox(height: 28),
                  if (widget.isPendingApproval && widget.uid != null) ...[
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        key: const Key('check-status-button'),
                        onPressed: _isRefreshing || _isSigningOut
                            ? null
                            : () async {
                                setState(() => _isRefreshing = true);
                                ref.invalidate(
                                  employeeProfileProvider(widget.uid!),
                                );
                                await Future<void>.delayed(
                                  const Duration(milliseconds: 600),
                                );
                                if (mounted) {
                                  setState(() => _isRefreshing = false);
                                }
                              },
                        icon: _isRefreshing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.refresh),
                        label: Text(
                          _isRefreshing
                              ? 'Memeriksa...'
                              : 'Periksa Status Akun',
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: _isSigningOut ? null : _signOut,
                        child: Text(
                          _isSigningOut
                              ? 'Memproses...'
                              : 'Keluar / Ganti Akun',
                        ),
                      ),
                    ),
                  ] else ...[
                    FilledButton(
                      onPressed: _isSigningOut ? null : _signOut,
                      child: Text(
                        _isSigningOut ? 'Memproses...' : 'Keluar dari akun',
                      ),
                    ),
                  ],
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
