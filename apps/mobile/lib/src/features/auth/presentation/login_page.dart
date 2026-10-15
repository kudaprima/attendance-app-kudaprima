import 'package:attendance/src/core/config/app_config.dart';
import 'package:attendance/src/features/auth/application/auth_error_message.dart';
import 'package:attendance/src/features/auth/application/auth_providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});
  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _busy = false;
  bool _obscurePassword = true;
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool get _validEmail =>
      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
          .hasMatch(_emailController.text.trim());
  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _busy = true);
    try {
      await action();
    } catch (error) {
      if (mounted) _message(AuthErrorMessage.from(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _message(String message) =>
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
  Future<void> _submit() async {
    if (_formKey.currentState?.validate() != true) return;
    await _run(() async {
      await ref
          .read(authRepositoryProvider)
          .signInWithEmail(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
      TextInput.finishAutofillContext();
    });
  }

  Future<void> _resetPassword() async {
    final email = _emailController.text.trim();
    if (!_validEmail) {
      _message(
        'Masukkan Email terlebih dahulu untuk mengatur ulang kata sandi.',
      );
      return;
    }
    await _run(() async {
      await ref.read(authRepositoryProvider).sendPasswordResetEmail(email);
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Pengaturan Ulang Kata Sandi'),
          content: Text(
            'Petunjuk reset kata sandi telah dikirim ke $email. '
            'Silakan periksa kotak masuk (inbox) atau folder spam email Anda.\n\n'
            'Catatan: Jika akun Anda menggunakan email internal yang tidak memiliki kotak masuk aktif, '
            'silakan hubungi Administrator HR untuk bantuan pengaturan ulang kata sandi.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Mengerti'),
            ),
          ],
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Stack(
        children: [
          Positioned(
            top: 14,
            left: 18,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainerHighest
                    .withValues(alpha: 0.6),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Theme.of(context).colorScheme.outlineVariant
                      .withValues(alpha: 0.5),
                ),
              ),
              child: Text(
                AppConfig.appVersion,
                key: const Key('login-app-version'),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: AutofillGroup(
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Semantics(
                                  label: 'Logo PT Kuda Prima',
                                  image: true,
                                  child: Image.asset(
                                    'assets/branding/pt-kuda-prima-logo.png',
                                    key: const Key('login-brand-logo'),
                                    height: 88,
                                    fit: BoxFit.contain,
                                    excludeFromSemantics: true,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Masuk ke aplikasi presensi',
                                  textAlign: TextAlign.center,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium,
                                ),
                                const SizedBox(height: 24),
                                TextFormField(
                                  key: const Key('login-email'),
                                  controller: _emailController,
                                  enabled: !_busy,
                                  keyboardType: TextInputType.emailAddress,
                                  textInputAction: TextInputAction.next,
                                  autofillHints: const [AutofillHints.username],
                                  decoration: const InputDecoration(
                                    labelText: 'Email',
                                    hintText: 'Email',
                                    prefixIcon: Icon(Icons.mail_outline),
                                  ),
                                  validator: (_) => _validEmail
                                      ? null
                                      : 'Masukkan email yang valid.',
                                ),
                                const SizedBox(height: 16),
                                TextFormField(
                                  key: const Key('login-password'),
                                  controller: _passwordController,
                                  enabled: !_busy,
                                  obscureText: _obscurePassword,
                                  textInputAction: TextInputAction.done,
                                  autofillHints: const [AutofillHints.password],
                                  onFieldSubmitted: (_) => _submit(),
                                  decoration: InputDecoration(
                                    labelText: 'Kata Sandi',
                                    hintText: 'Kata Sandi',
                                    prefixIcon: const Icon(Icons.lock_outline),
                                    suffixIcon: IconButton(
                                      tooltip: _obscurePassword
                                          ? 'Tampilkan kata sandi'
                                          : 'Sembunyikan kata sandi',
                                      onPressed: _busy
                                          ? null
                                          : () => setState(
                                              () => _obscurePassword =
                                                  !_obscurePassword,
                                            ),
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                      ),
                                    ),
                                  ),
                                  validator: (value) => (value ?? '').isEmpty
                                      ? 'Masukkan kata sandi.'
                                      : null,
                                ),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: _busy ? null : _resetPassword,
                                    child: const Text('Lupa Kata Sandi'),
                                  ),
                                ),
                                FilledButton(
                                  style: FilledButton.styleFrom(
                                    minimumSize: const Size.fromHeight(48),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  onPressed: _busy ? null : _submit,
                                  child: Text(_busy ? 'Memeriksa...' : 'Masuk'),
                                ),
                                const SizedBox(height: 16),
                                const Row(
                                  children: [
                                    Expanded(child: Divider()),
                                    Padding(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: 12,
                                      ),
                                      child: Text('atau'),
                                    ),
                                    Expanded(child: Divider()),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    minimumSize: const Size.fromHeight(48),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                  ),
                                  icon: const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CustomPaint(
                                      key: Key('google-logo-icon'),
                                      painter: _GoogleLogoPainter(),
                                    ),
                                  ),
                                  label: const Text('Masuk dengan Google'),
                                  onPressed: _busy
                                      ? null
                                      : () => _run(
                                          () => ref
                                              .read(authRepositoryProvider)
                                              .signInWithGoogle(),
                                        ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      '© ${DateTime.now().year} ${AppConfig.companyName}. Seluruh hak cipta dilindungi.',
                      key: const Key('login-copyright-text'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant
                            .withValues(alpha: 0.8),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _GoogleLogoPainter extends CustomPainter {
  const _GoogleLogoPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / 24.0;
    canvas.save();
    canvas.scale(scale, scale);

    // Blue
    final bluePaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;
    final bluePath = Path()
      ..moveTo(23.745, 12.27)
      ..cubicTo(23.745, 11.48, 23.675, 10.73, 23.545, 10)
      ..lineTo(12, 10)
      ..lineTo(12, 14.51)
      ..lineTo(18.59, 14.51)
      ..cubicTo(18.3, 16.03, 17.43, 17.31, 16.12, 18.17)
      ..lineTo(16.12, 21.28)
      ..lineTo(20.08, 21.28)
      ..cubicTo(22.4, 19.14, 23.745, 15.99, 23.745, 12.27)
      ..close();
    canvas.drawPath(bluePath, bluePaint);

    // Green
    final greenPaint = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.fill;
    final greenPath = Path()
      ..moveTo(12, 24)
      ..cubicTo(15.24, 24, 17.96, 22.92, 20.08, 20.97)
      ..lineTo(16.12, 17.86)
      ..cubicTo(15.03, 18.6, 13.63, 19.04, 12, 19.04)
      ..cubicTo(8.87, 19.04, 6.22, 16.92, 5.27, 14.07)
      ..lineTo(1.18, 14.07)
      ..lineTo(1.18, 17.24)
      ..cubicTo(3.25, 21.36, 7.31, 24, 12, 24)
      ..close();
    canvas.drawPath(greenPath, greenPaint);

    // Yellow
    final yellowPaint = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.fill;
    final yellowPath = Path()
      ..moveTo(5.27, 14.29)
      ..cubicTo(5.03, 13.57, 4.9, 12.8, 4.9, 12)
      ..cubicTo(4.9, 11.2, 5.03, 10.43, 5.27, 9.71)
      ..lineTo(5.27, 6.54)
      ..lineTo(1.18, 6.54)
      ..cubicTo(0.43, 8.04, 0, 9.97, 0, 12)
      ..cubicTo(0, 14.03, 0.43, 15.96, 1.18, 17.46)
      ..lineTo(5.27, 14.29)
      ..close();
    canvas.drawPath(yellowPath, yellowPaint);

    // Red
    final redPaint = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.fill;
    final redPath = Path()
      ..moveTo(12, 4.96)
      ..cubicTo(13.76, 4.96, 15.34, 5.57, 16.59, 6.75)
      ..lineTo(20.17, 3.17)
      ..cubicTo(17.96, 1.11, 15.24, 0, 12, 0)
      ..cubicTo(7.31, 0, 3.25, 2.64, 1.18, 6.76)
      ..lineTo(5.27, 9.93)
      ..cubicTo(6.22, 7.08, 8.87, 4.96, 12, 4.96)
      ..close();
    canvas.drawPath(redPath, redPaint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
