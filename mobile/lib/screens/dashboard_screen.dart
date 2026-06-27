import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../store/write_off_store.dart';
import '../theme.dart';

void _showProfileSheet(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: const BoxDecoration(
                color: BahandiColors.green,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  'КА',
                  style: GoogleFonts.golosText(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Кассир Актау',
              style: GoogleFonts.golosText(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: BahandiColors.charcoal,
              ),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: BahandiColors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                'Кассир',
                style: GoogleFonts.golosText(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: BahandiColors.green,
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Mega Silk Way',
              style: GoogleFonts.golosText(
                fontSize: 14,
                color: BahandiColors.muted,
              ),
            ),
            const SizedBox(height: 16),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: Text(
                'Выйти',
                style: GoogleFonts.golosText(
                  fontSize: 15,
                  color: Colors.red,
                ),
              ),
              onTap: () {
                Navigator.of(ctx).pop();
                ctx.go('/login');
              },
            ),
          ],
        ),
      );
    },
  );
}

const _reasonLabels = {
  'DAMAGED': 'Повреждён',
  'EXPIRED': 'Истёк срок',
  'OVERCOOKED': 'Пережарен',
  'RAW_WASTE': 'Сырьевые отходы',
  'OTHER': 'Другое',
};

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final store = context.watch<WriteOffStore>();
    final now = DateTime.now();
    final shiftStart = DateTime(now.year, now.month, now.day, 9, 0);
    final startLabel =
        '${shiftStart.hour.toString().padLeft(2, '0')}:${shiftStart.minute.toString().padLeft(2, '0')}';

    return Scaffold(
      backgroundColor: BahandiColors.surface,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            pinned: true,
            title: Row(
              children: [
                Text(
                  'Bahandi Reporter',
                  style: GoogleFonts.golosText(
                    fontWeight: FontWeight.w700,
                    color: BahandiColors.charcoal,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: BahandiColors.green,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'v2',
                    style: GoogleFonts.golosText(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.person_outline),
                onPressed: () => _showProfileSheet(context),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ShiftCard(
                    count: store.count,
                    startLabel: startLabel,
                  ),
                  const SizedBox(height: 16),
                  _QuickAction(onTap: () => context.go('/new')),
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
                  if (store.recent.isEmpty)
                    _EmptyState()
                  else
                    ...store.recent.map((e) => _WriteOffCard(entry: e)),
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
  const _ShiftCard({
    required this.count,
    required this.startLabel,
  });
  final int count;
  final String startLabel;

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
            style: GoogleFonts.golosText(fontSize: 13, color: Colors.white54),
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
              _ShiftStat(label: 'Заявок', value: count.toString()),
              const SizedBox(width: 24),
              _ShiftStat(label: 'Начало', value: startLabel),
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
        Text(label,
            style: GoogleFonts.golosText(fontSize: 12, color: Colors.white54)),
        Text(value,
            style: GoogleFonts.golosText(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white)),
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
                  style:
                      GoogleFonts.golosText(fontSize: 13, color: Colors.white70),
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

class _WriteOffCard extends StatelessWidget {
  const _WriteOffCard({required this.entry});
  final WriteOffEntry entry;

  @override
  Widget build(BuildContext context) {
    final time =
        '${entry.submittedAt.hour.toString().padLeft(2, '0')}:${entry.submittedAt.minute.toString().padLeft(2, '0')}';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: BahandiColors.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: BahandiColors.green.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.inventory_2_outlined,
                color: BahandiColors.green, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.product,
                  style: GoogleFonts.golosText(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: BahandiColors.charcoal,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${entry.quantity} ${entry.unit} · ${_reasonLabels[entry.reason] ?? entry.reason}',
                  style: GoogleFonts.golosText(
                      fontSize: 12, color: BahandiColors.muted),
                ),
              ],
            ),
          ),
          Text(time,
              style: GoogleFonts.golosText(
                  fontSize: 12, color: BahandiColors.muted)),
        ],
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
          Icon(Icons.inbox_outlined,
              size: 48, color: BahandiColors.muted.withValues(alpha: 0.5)),
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
