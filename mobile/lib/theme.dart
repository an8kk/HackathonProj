import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class BahandiColors {
  static const green = Color(0xFF198754);
  static const greenDark = Color(0xFF0A6730);
  static const orange = Color(0xFFEA5E1F);
  static const charcoal = Color(0xFF2B2A28);
  static const charcoal2 = Color(0xFF292929);
  static const offwhite = Color(0xFFFEFEFE);
  static const surface = Color(0xFFF8F8F8);
  static const surfaceHover = Color(0xFFEAEAEA);
  static const cardBorder = Color(0xFFF3F3F3);
  static const muted = Color(0xFF999999);
}

ThemeData bahandiTheme() {
  final base = ThemeData(
    colorScheme: ColorScheme.light(
      primary: BahandiColors.green,
      secondary: BahandiColors.orange,
      surface: BahandiColors.offwhite,
      onPrimary: Colors.white,
      onSurface: BahandiColors.charcoal,
    ),
    scaffoldBackgroundColor: BahandiColors.offwhite,
    textTheme: GoogleFonts.golosTextTextTheme().apply(
      bodyColor: BahandiColors.charcoal,
      displayColor: BahandiColors.charcoal,
    ),
    useMaterial3: true,
  );

  return base.copyWith(
    appBarTheme: AppBarTheme(
      backgroundColor: BahandiColors.offwhite.withValues(alpha: 0.9),
      foregroundColor: BahandiColors.charcoal,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      titleTextStyle: GoogleFonts.golosText(
        color: BahandiColors.charcoal,
        fontSize: 17,
        fontWeight: FontWeight.w600,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: BahandiColors.offwhite,
      selectedItemColor: BahandiColors.orange,
      unselectedItemColor: BahandiColors.muted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: BahandiColors.green,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: GoogleFonts.golosText(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: BahandiColors.charcoal,
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(color: BahandiColors.cardBorder),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: GoogleFonts.golosText(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: BahandiColors.cardBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: BahandiColors.cardBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: BahandiColors.charcoal2, width: 1.5),
      ),
      labelStyle: GoogleFonts.golosText(color: BahandiColors.muted),
    ),
    cardTheme: CardThemeData(
      color: BahandiColors.offwhite,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: BahandiColors.cardBorder),
      ),
    ),
  );
}
