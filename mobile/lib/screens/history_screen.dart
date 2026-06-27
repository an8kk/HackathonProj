import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../store/write_off_store.dart';
import '../theme.dart';

const _reasonLabels = {
  'DAMAGED': 'Повреждён',
  'EXPIRED': 'Истёк срок',
  'OVERCOOKED': 'Пережарен',
  'RAW_WASTE': 'Сырьевые отходы',
  'OTHER': 'Другое',
};

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final entries = context.watch<WriteOffStore>().entries.reversed.toList();

    return Scaffold(
      backgroundColor: BahandiColors.surface,
      appBar: AppBar(title: const Text('История заявок')),
      body: entries.isEmpty
          ? const _EmptyHistory()
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: entries.length,
              itemBuilder: (context, i) => _HistoryCard(entry: entries[i]),
            ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.entry});
  final WriteOffEntry entry;

  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
        return BahandiColors.green;
      case 'rejected':
        return const Color(0xFFDC3545);
      default:
        return BahandiColors.orange;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'Одобрено';
      case 'rejected':
        return 'Отклонено';
      default:
        return 'На проверке';
    }
  }

  @override
  Widget build(BuildContext context) {
    final date = entry.submittedAt;
    final dateLabel =
        '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    final timeLabel =
        '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';

    final statusColor = _statusColor(entry.status);
    final statusLabel = _statusLabel(entry.status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: BahandiColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  entry.product,
                  style: GoogleFonts.golosText(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: BahandiColors.charcoal,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  statusLabel,
                  style: GoogleFonts.golosText(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: BahandiColors.cardBorder),
          const SizedBox(height: 10),
          _Row(
            icon: Icons.scale_outlined,
            label: 'Количество',
            value: '${entry.quantity} ${entry.unit}',
          ),
          const SizedBox(height: 6),
          _Row(
            icon: Icons.info_outline,
            label: 'Причина',
            value: _reasonLabels[entry.reason] ?? entry.reason,
          ),
          if (entry.comment.isNotEmpty) ...[
            const SizedBox(height: 6),
            _Row(
              icon: Icons.chat_bubble_outline,
              label: 'Комментарий',
              value: entry.comment,
            ),
          ],
          const SizedBox(height: 10),
          Text(
            '$dateLabel в $timeLabel',
            style: GoogleFonts.golosText(
              fontSize: 12,
              color: BahandiColors.muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 15, color: BahandiColors.muted),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: GoogleFonts.golosText(fontSize: 13, color: BahandiColors.muted),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.golosText(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: BahandiColors.charcoal,
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyHistory extends StatelessWidget {
  const _EmptyHistory();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
              style:
                  GoogleFonts.golosText(fontSize: 14, color: BahandiColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}
