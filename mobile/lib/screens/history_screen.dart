import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BahandiColors.surface,
      appBar: AppBar(
        title: const Text('История заявок'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          _EmptyHistory(),
        ],
      ),
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BahandiColors.cardBorder),
      ),
      child: Column(
        children: [
          Icon(
            Icons.receipt_long_outlined,
            size: 52,
            color: BahandiColors.muted.withValues(alpha: 0.4),
          ),
          const SizedBox(height: 16),
          Text(
            'История пуста',
            style: GoogleFonts.golosText(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: BahandiColors.charcoal,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Ваши заявки на списание появятся здесь',
            textAlign: TextAlign.center,
            style: GoogleFonts.golosText(
              fontSize: 14,
              color: BahandiColors.muted,
            ),
          ),
        ],
      ),
    );
  }
}
