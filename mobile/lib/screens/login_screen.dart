import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../store/auth_store.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _idController = TextEditingController();
  final _pinController = TextEditingController();
  bool _loading = false;
  String? _error;

  static const _validCredentials = {'1001': '1234', '1002': '0000', '1003': '1111'};

  Future<void> _login() async {
    final id = _idController.text.trim();
    final pin = _pinController.text.trim();
    if (id.isEmpty || pin.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    if (_validCredentials[id] == pin) {
      await context.read<AuthStore>().login();
      if (!mounted) return;
      context.go('/dashboard');
    } else {
      setState(() {
        _loading = false;
        _error = 'Неверный ID сотрудника или PIN-код';
      });
    }
  }

  bool get _canLogin =>
      _idController.text.trim().isNotEmpty && _pinController.text.trim().isNotEmpty;

  @override
  void dispose() {
    _idController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BahandiColors.offwhite,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(flex: 2),
              _Logo(),
              const SizedBox(height: 48),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Вход',
                  style: GoogleFonts.golosText(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: BahandiColors.charcoal,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Введите ID сотрудника и PIN-код',
                  style: GoogleFonts.golosText(
                    fontSize: 15,
                    color: BahandiColors.muted,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: BahandiColors.cardBorder),
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    TextField(
                      controller: _idController,
                      keyboardType: TextInputType.number,
                      maxLength: 10,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        labelText: 'ID сотрудника',
                        counterText: '',
                        prefixIcon: Icon(Icons.badge_outlined, color: BahandiColors.muted),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _pinController,
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      maxLength: 6,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _canLogin && !_loading ? _login() : null,
                      decoration: const InputDecoration(
                        labelText: 'PIN-код',
                        counterText: '',
                        prefixIcon: Icon(Icons.lock_outline, color: BahandiColors.muted),
                      ),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(color: Colors.red, fontSize: 13),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Демо: ID 1001, PIN 1234',
                        style: GoogleFonts.golosText(
                          fontSize: 12,
                          color: BahandiColors.muted,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (_canLogin && !_loading) ? _login : null,
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Войти'),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(flex: 3),
              Text(
                'Bahandi Burger © 2025',
                style: GoogleFonts.golosText(
                  fontSize: 12,
                  color: BahandiColors.muted,
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: BahandiColors.green,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.fastfood, color: Colors.white, size: 20),
        ),
        const SizedBox(width: 10),
        Text(
          'Bahandi',
          style: GoogleFonts.golosText(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: BahandiColors.charcoal,
          ),
        ),
        Text(
          ' Reporter',
          style: GoogleFonts.golosText(
            fontSize: 24,
            fontWeight: FontWeight.w400,
            color: BahandiColors.muted,
          ),
        ),
      ],
    );
  }
}
