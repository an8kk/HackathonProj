import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'store/write_off_store.dart';
import 'theme.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = WriteOffStore();
  await store.load();
  runApp(
    ChangeNotifierProvider.value(
      value: store,
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
