import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BahandiColors.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            pinned: true,
            title: Text(
              'Bahandi Reporter',
              style: GoogleFonts.golosText(
                fontWeight: FontWeight.w700,
                color: BahandiColors.charcoal,
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.person_outline),
                onPressed: () {},
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ShiftCard(),
                  const SizedBox(height: 16),
                  _QuickAction(
                    onTap: () => context.go('/new'),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Последние заявки',
                    style: GoogleFonts.golosText(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      color: BahandiColors.charcoal,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _EmptyState(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ShiftCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: BahandiColors.charcoal,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Текущая смена',
            style: GoogleFonts.golosText(
              fontSize: 13,
              color: Colors.white54,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Mega Silk Way',
            style: GoogleFonts.golosText(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _ShiftStat(label: 'Заявок', value: '0'),
              const SizedBox(width: 24),
              _ShiftStat(label: 'Начало', value: '09:00'),
              const SizedBox(width: 24),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: BahandiColors.green,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Активна',
                  style: GoogleFonts.golosText(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ShiftStat extends StatelessWidget {
  const _ShiftStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.golosText(fontSize: 12, color: Colors.white54)),
        Text(value, style: GoogleFonts.golosText(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
      ],
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: BahandiColors.green,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            const Icon(Icons.add_circle_outline, color: Colors.white, size: 28),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Новая заявка на списание',
                  style: GoogleFonts.golosText(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                Text(
                  'Штучный или весовой товар',
                  style: GoogleFonts.golosText(fontSize: 13, color: Colors.white70),
                ),
              ],
            ),
            const Spacer(),
            const Icon(Icons.arrow_forward_ios, color: Colors.white54, size: 16),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BahandiColors.cardBorder),
      ),
      child: Column(
        children: [
          Icon(Icons.inbox_outlined, size: 48, color: BahandiColors.muted.withValues(alpha: 0.5)),
          const SizedBox(height: 12),
          Text(
            'Заявок пока нет',
            style: GoogleFonts.golosText(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: BahandiColors.charcoal,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Нажмите «Списание» чтобы создать первую заявку',
            textAlign: TextAlign.center,
            style: GoogleFonts.golosText(fontSize: 13, color: BahandiColors.muted),
          ),
        ],
      ),
    );
  }
}
