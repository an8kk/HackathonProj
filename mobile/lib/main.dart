import 'package:flutter/material.dart';
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

class BahandiApp extends StatelessWidget {
  const BahandiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Bahandi Reporter',
      theme: bahandiTheme(),
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
