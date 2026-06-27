import 'package:flutter/material.dart';
import 'theme.dart';
import 'router.dart';

void main() {
  runApp(const BahandiApp());
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
