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
  final _pinController = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _login() async {
    final pin = _pinController.text.trim();
    if (pin.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final store = context.read<AuthStore>();
    final user = await store.login(pin);
    if (!mounted) return;
    if (user != null) {
      context.go('/dashboard');
    } else {
      setState(() {
        _loading = false;
        _error = store.error == 'invalid_pin' || store.error == 'unauthorized'
            ? 'Неверный PIN-код'
            : 'Не удалось войти. Проверьте подключение.';
      });
    }
  }

  bool get _canLogin => _pinController.text.trim().isNotEmpty;

  @override
  void dispose() {
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
                  'Введите PIN-код',
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
                        'Демо PIN: 1111 · 2222 · 9999 · 3333',
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
