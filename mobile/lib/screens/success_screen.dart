import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../store/write_off_store.dart';
import '../theme.dart';

const _reasonLabels = {
  'DAMAGED': 'Повреждён',
  'EXPIRED': 'Истёк срок',
  'OVERCOOKED': 'Пережарен',
  'RAW_WASTE': 'Сырьевые отходы',
  'OTHER': 'Другое',
};

class SuccessScreen extends StatelessWidget {
  const SuccessScreen({super.key, required this.entry});

  final WriteOffEntry entry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BahandiColors.offwhite,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),
              // Checkmark icon
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: BahandiColors.green.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: BahandiColors.green,
                  size: 60,
                ),
              ),
              const SizedBox(height: 24),
              // Title
              Text(
                'Заявка отправлена!',
                textAlign: TextAlign.center,
                style: GoogleFonts.golosText(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: BahandiColors.charcoal,
                ),
              ),
              const SizedBox(height: 10),
              // Subtitle
              Text(
                'Ваша заявка принята и ожидает проверки супервайзера',
                textAlign: TextAlign.center,
                style: GoogleFonts.golosText(
                  fontSize: 15,
                  color: BahandiColors.muted,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 32),
              // Summary card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: BahandiColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Детали заявки',
                      style: GoogleFonts.golosText(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: BahandiColors.charcoal,
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: BahandiColors.cardBorder),
                    const SizedBox(height: 14),
                    _SummaryRow(
                      icon: Icons.inventory_2_outlined,
                      label: 'Продукт',
                      value: entry.product.isEmpty ? '—' : entry.product,
                    ),
                    const SizedBox(height: 12),
                    _SummaryRow(
                      icon: entry.unit == 'г'
                          ? Icons.monitor_weight_outlined
                          : Icons.tag,
                      label: entry.unit == 'г' ? 'Масса' : 'Количество',
                      value: '${entry.quantity} ${entry.unit}',
                    ),
                    const SizedBox(height: 12),
                    _SummaryRow(
                      icon: Icons.info_outline,
                      label: 'Причина',
                      value: _reasonLabels[entry.reason] ?? entry.reason,
                    ),
                    if (entry.comment.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _SummaryRow(
                        icon: Icons.chat_bubble_outline,
                        label: 'Комментарий',
                        value: entry.comment,
                      ),
                    ],
                  ],
                ),
              ),
              const Spacer(),
              // Buttons
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.go('/dashboard'),
                  child: const Text('На главную'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => context.go('/history'),
                  child: const Text('История'),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: BahandiColors.muted),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.golosText(
                  fontSize: 11,
                  color: BahandiColors.muted,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.golosText(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: BahandiColors.charcoal,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
