import 'package:attendance/src/features/auth/application/auth_error_message.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:attendance/src/features/auth/presentation/login_page.dart';
import 'package:attendance/src/features/profile/presentation/employee_profile_gate.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider);

    return session.when(
      loading: () => const _AuthLoadingPage(),
      data: (value) => value == null
          ? const LoginPage()
          : EmployeeProfileGate(session: value),
      error: (error, stackTrace) => _AuthFailurePage(error: error),
    );
  }
}

class _AuthLoadingPage extends StatelessWidget {
  const _AuthLoadingPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(child: Center(child: CircularProgressIndicator())),
    );
  }
}

class _AuthFailurePage extends ConsumerStatefulWidget {
  const _AuthFailurePage({required this.error});

  final Object error;

  @override
  ConsumerState<_AuthFailurePage> createState() => _AuthFailurePageState();
}

class _AuthFailurePageState extends ConsumerState<_AuthFailurePage> {
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
                  const Icon(Icons.gpp_bad_outlined, size: 52),
                  const SizedBox(height: 16),
                  Text(
                    'Akun tidak dapat digunakan',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AuthErrorMessage.from(widget.error),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _isSigningOut ? null : _signOut,
                    child: Text(
                      _isSigningOut
                          ? 'Memproses...'
                          : 'Kembali ke halaman login',
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
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(AuthErrorMessage.from(error))));
    } finally {
      if (mounted) setState(() => _isSigningOut = false);
    }
  }
}
