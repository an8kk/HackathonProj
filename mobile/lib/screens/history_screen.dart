import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../store/write_off_store.dart';
import '../store/auth_store.dart';
import '../theme.dart';

const _reasonLabels = {
  'DAMAGED': 'Повреждён',
  'EXPIRED': 'Истёк срок',
  'OVERCOOKED': 'Пережарен',
  'RAW_WASTE': 'Сырьевые отходы',
  'OTHER': 'Другое',
};

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = context.read<AuthStore>().user?.id;
      if (id != null) {
        context.read<WriteOffStore>().loadHistory(employeeId: id);
      }
    });
  }

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

  @override
  Widget build(BuildContext context) {
    final date = entry.submittedAt;
    final dateLabel =
        '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
    final timeLabel =
        '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';

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
          Text(
            entry.product,
            style: GoogleFonts.golosText(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              color: BahandiColors.charcoal,
            ),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$dateLabel в $timeLabel',
                    style: GoogleFonts.golosText(
                      fontSize: 12,
                      color: BahandiColors.muted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  _StatusBadge(status: entry.status),
                ],
              ),
              _RepeatButton(entry: entry),
            ],
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

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'approved' => ('Одобрено', BahandiColors.green),
      'rejected' => ('Отклонено', const Color(0xFFDC3545)),
      _ => ('На проверке', BahandiColors.orange),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: GoogleFonts.golosText(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _RepeatButton extends StatelessWidget {
  const _RepeatButton({required this.entry});
  final WriteOffEntry entry;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        context.go('/new', extra: {
          'prefill': {
            'product': entry.product,
            'quantity': entry.quantity,
            'unit': entry.unit,
            'reason': entry.reason,
            'comment': entry.comment,
          },
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: BahandiColors.green.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: BahandiColors.green.withValues(alpha: 0.2)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.refresh, size: 14, color: BahandiColors.green),
            const SizedBox(width: 6),
            Text(
              'Повторить заявку',
              style: GoogleFonts.golosText(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: BahandiColors.green,
              ),
            ),
          ],
        ),
      ),
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
