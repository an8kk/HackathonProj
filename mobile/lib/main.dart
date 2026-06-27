import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'store/write_off_store.dart';
import 'store/auth_store.dart';
import 'theme.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = WriteOffStore();
  final auth = AuthStore();
  await Future.wait([store.load(), auth.load()]);
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: store),
        ChangeNotifierProvider.value(value: auth),
      ],
      child: const BahandiApp(),
    ),
  );
}

class BahandiApp extends StatefulWidget {
  const BahandiApp({super.key});

  @override
  State<BahandiApp> createState() => _BahandiAppState();
}

class _BahandiAppState extends State<BahandiApp> {
  // Dev reset sequence: Volume Up → Down → Up → Up → Down
  static const _devSequence = [
    LogicalKeyboardKey.audioVolumeUp,
    LogicalKeyboardKey.audioVolumeDown,
    LogicalKeyboardKey.audioVolumeUp,
    LogicalKeyboardKey.audioVolumeUp,
    LogicalKeyboardKey.audioVolumeDown,
  ];
  final List<LogicalKeyboardKey> _keyBuffer = [];

  void _handleKey(KeyEvent event) {
    if (event is! KeyDownEvent) return;
    final key = event.logicalKey;
    if (key != LogicalKeyboardKey.audioVolumeUp &&
        key != LogicalKeyboardKey.audioVolumeDown) {
      _keyBuffer.clear();
      return;
    }
    _keyBuffer.add(key);
    if (_keyBuffer.length > _devSequence.length) {
      _keyBuffer.removeAt(0);
    }
    if (_keyBuffer.length == _devSequence.length &&
        _keyEquals(_keyBuffer, _devSequence)) {
      _keyBuffer.clear();
      _triggerDevReset();
    }
  }

  bool _keyEquals(
      List<LogicalKeyboardKey> a, List<LogicalKeyboardKey> b) {
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }

  Future<void> _triggerDevReset() async {
    final auth = context.read<AuthStore>();
    final store = context.read<WriteOffStore>();
    await auth.devReset();
    await store.clear();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Dev reset — все данные очищены'),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 2),
      ),
    );
    router.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      focusNode: FocusNode(),
      autofocus: false,
      onKeyEvent: _handleKey,
      child: MaterialApp.router(
        title: 'Bahandi Reporter',
        theme: bahandiTheme(),
        routerConfig: router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
