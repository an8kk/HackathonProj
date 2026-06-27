import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../store/auth_store.dart';
import '../store/write_off_store.dart';
import '../theme.dart';

const _reasonLabels = {
  'DAMAGED': 'Повреждён',
  'EXPIRED': 'Истёк срок',
  'OVERCOOKED': 'Пережарен',
  'RAW_WASTE': 'Сырьевые отходы',
  'OTHER': 'Другое',
};

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  // Secret dev reset: tap the title 5 times within 3 seconds
  int _titleTaps = 0;
  DateTime? _firstTapAt;

  void _onTitleTap() {
    final now = DateTime.now();
    if (_firstTapAt == null || now.difference(_firstTapAt!) > const Duration(seconds: 3)) {
      _firstTapAt = now;
      _titleTaps = 1;
    } else {
      _titleTaps++;
    }
    if (_titleTaps >= 5) {
      _titleTaps = 0;
      _firstTapAt = null;
      _confirmDevReset();
    }
  }

  Future<void> _confirmDevReset() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Dev Reset'),
        content: const Text('Очистить все данные и выйти из аккаунта?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Сбросить', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final auth = context.read<AuthStore>();
    final store = context.read<WriteOffStore>();
    await auth.devReset();
    await store.devReset();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Dev reset — все данные очищены'),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 2),
      ),
    );
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<WriteOffStore>();
    final auth = context.watch<AuthStore>();
    final user = auth.user;
    final outlet = auth.currentOutlet;

    final now = DateTime.now();
    final shiftStart = DateTime(now.year, now.month, now.day, 9, 0);
    final startLabel =
        '${shiftStart.hour.toString().padLeft(2, '0')}:${shiftStart.minute.toString().padLeft(2, '0')}';

    return Scaffold(
      backgroundColor: BahandiColors.surface,
      drawer: _AppDrawer(user: user, currentOutlet: outlet),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            pinned: true,
            automaticallyImplyLeading: false,
            leading: Builder(
              builder: (ctx) => IconButton(
                icon: const Icon(Icons.menu),
                onPressed: () => Scaffold.of(ctx).openDrawer(),
              ),
            ),
            title: GestureDetector(
              onTap: _onTitleTap,
              behavior: HitTestBehavior.opaque,
              child: Row(
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
            ),
            actions: [
              Builder(
                builder: (ctx) => GestureDetector(
                  onTap: () => Scaffold.of(ctx).openDrawer(),
                  child: Padding(
                    padding: const EdgeInsets.only(right: 16),
                    child: _Avatar(
                      initials: user?.initials ?? '?',
                      size: 34,
                    ),
                  ),
                ),
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
                    outlet: outlet,
                    userName: user?.name.split(' ').first ?? '',
                  ),
                  if (store.hasSuspiciousCluster) ...[
                    const SizedBox(height: 12),
                    _ClusterWarning(),
                  ],
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

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.user, required this.currentOutlet});
  final AppUser? user;
  final String currentOutlet;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
              child: Row(
                children: [
                  _Avatar(initials: user?.initials ?? '?', size: 52),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name ?? 'Сотрудник',
                          style: GoogleFonts.golosText(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: BahandiColors.charcoal,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: BahandiColors.green.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            user?.roleLabel ?? '',
                            style: GoogleFonts.golosText(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: BahandiColors.green,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Divider(indent: 20, endIndent: 20),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'ТОРГОВАЯ ТОЧКА',
                style: GoogleFonts.golosText(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: BahandiColors.muted,
                  letterSpacing: 0.8,
                ),
              ),
            ),
            const SizedBox(height: 4),
            ...allOutlets.map((outlet) {
              final selected = outlet == currentOutlet;
              return ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 20),
                dense: true,
                leading: Icon(
                  selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                  color: selected ? BahandiColors.green : BahandiColors.muted,
                  size: 20,
                ),
                title: Text(
                  outlet,
                  style: GoogleFonts.golosText(
                    fontSize: 14,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                    color: selected ? BahandiColors.charcoal : BahandiColors.muted,
                  ),
                ),
                onTap: () {
                  context.read<AuthStore>().setOutlet(outlet);
                  Navigator.of(context).pop();
                },
              );
            }),
            const Spacer(),
            const Divider(indent: 20, endIndent: 20),
            ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 20),
              leading: const Icon(Icons.logout, color: Colors.red, size: 20),
              title: Text(
                'Выйти',
                style: GoogleFonts.golosText(fontSize: 14, color: Colors.red),
              ),
              onTap: () async {
                Navigator.of(context).pop();
                await context.read<AuthStore>().logout();
                if (context.mounted) context.go('/login');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.initials, this.size = 36});
  final String initials;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(color: BahandiColors.green, shape: BoxShape.circle),
      child: Center(
        child: Text(
          initials,
          style: GoogleFonts.golosText(
            fontSize: size * 0.38,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}

class _ClusterWarning extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: BahandiColors.orange.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: BahandiColors.orange.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: BahandiColors.orange, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Подозрительная активность: 3+ заявки за 10 минут',
              style: GoogleFonts.golosText(fontSize: 12, color: BahandiColors.orange),
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
    required this.outlet,
    required this.userName,
  });
  final int count;
  final String startLabel;
  final String outlet;
  final String userName;

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
            userName.isNotEmpty ? 'Добрый день, $userName' : 'Текущая смена',
            style: GoogleFonts.golosText(fontSize: 13, color: Colors.white54),
          ),
          const SizedBox(height: 4),
          Text(
            outlet,
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
        Text(label, style: GoogleFonts.golosText(fontSize: 12, color: Colors.white54)),
        Text(value,
            style: GoogleFonts.golosText(
                fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
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
            child: const Icon(Icons.inventory_2_outlined, color: BahandiColors.green, size: 20),
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
                  style: GoogleFonts.golosText(fontSize: 12, color: BahandiColors.muted),
                ),
              ],
            ),
          ),
          Text(time, style: GoogleFonts.golosText(fontSize: 12, color: BahandiColors.muted)),
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
