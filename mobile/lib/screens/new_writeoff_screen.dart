import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../store/write_off_store.dart';
import '../theme.dart';

enum WriteoffType { shtuchny, vesovoy }

const _reasonCodes = [
  'DAMAGED',
  'EXPIRED',
  'OVERCOOKED',
  'RAW_WASTE',
  'OTHER',
];

const _reasonLabels = {
  'DAMAGED': 'Повреждён',
  'EXPIRED': 'Истёк срок',
  'OVERCOOKED': 'Пережарен',
  'RAW_WASTE': 'Сырьевые отходы',
  'OTHER': 'Другое',
};

const _products = [
  'Говяжья котлета',
  'Булочка бургерная',
  'Картофель фри',
  'Куриная котлета',
  'Сыр',
  'Соус',
  'Листья салата',
];

class NewWriteoffScreen extends StatefulWidget {
  const NewWriteoffScreen({
    super.key,
    this.initialPhotoPath,
    this.initialAnalysis,
    this.prefill,
  });

  final String? initialPhotoPath;
  final Map<String, dynamic>? initialAnalysis;
  final Map<String, dynamic>? prefill;

  @override
  State<NewWriteoffScreen> createState() => _NewWriteoffScreenState();
}

class _NewWriteoffScreenState extends State<NewWriteoffScreen> {
  int _step = 0;
  WriteoffType _type = WriteoffType.shtuchny;
  String? _product;
  final _quantityController = TextEditingController();
  String? _reason;
  final _commentController = TextEditingController();
  XFile? _photo;
  Uint8List? _photoBytes;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialPhotoPath != null) {
      _photo = XFile(widget.initialPhotoPath!);
      _photo!.readAsBytes().then((bytes) {
        if (mounted) {
          setState(() => _photoBytes = bytes);
        }
      });
    }
    if (widget.initialAnalysis != null) {
      final analysis = widget.initialAnalysis!;
      _reason = _mapAnalysisReason(analysis['suggested_reason'] as String?);
      final detectedProduct = analysis['detected_product'] as String?;
      if (detectedProduct != null) {
        _product = _fuzzyMatchProduct(detectedProduct);
      }
    }
    if (widget.prefill != null) {
      final p = widget.prefill!;
      _product = p['product'] as String?;
      _reason = p['reason'] as String?;
      _quantityController.text = (p['quantity'] as String?) ?? '';
      _commentController.text = (p['comment'] as String?) ?? '';
      final unit = p['unit'] as String?;
      if (unit == 'г') _type = WriteoffType.vesovoy;
    }
  }

  String? _mapAnalysisReason(String? suggested) {
    if (suggested == null) return null;
    final lower = suggested.toLowerCase();
    if (lower.contains('damaged') || lower.contains('damage')) return 'DAMAGED';
    if (lower.contains('expired') || lower.contains('expire')) return 'EXPIRED';
    if (lower.contains('overcooked') || lower.contains('quality')) return 'OVERCOOKED';
    if (lower.contains('raw') || lower.contains('waste')) return 'RAW_WASTE';
    if (lower.contains('other')) return 'OTHER';
    return null;
  }

  String? _fuzzyMatchProduct(String detected) {
    final lower = detected.toLowerCase();
    for (final p in _products) {
      if (p.toLowerCase().contains(lower) || lower.contains(p.toLowerCase())) {
        return p;
      }
    }
    return null;
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
      maxWidth: 1280,
    );
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (!mounted) return;
    setState(() {
      _photo = picked;
      _photoBytes = bytes;
    });
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    await Future.delayed(const Duration(milliseconds: 400));
    if (!mounted) return;

    final entry = WriteOffEntry(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      product: _product ?? '',
      quantity: _quantityController.text,
      unit: _type == WriteoffType.shtuchny ? 'шт' : 'г',
      reason: _reason ?? '',
      comment: _commentController.text,
      submittedAt: DateTime.now(),
      status: 'pending',
    );
    await context.read<WriteOffStore>().add(entry);
    if (!mounted) return;

    context.go('/success', extra: entry);
  }

  @override
  void dispose() {
    _quantityController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BahandiColors.offwhite,
      appBar: AppBar(
        title: Text(_stepTitle()),
        leading: IconButton(
          icon: Icon(_step == 0 ? Icons.close : Icons.arrow_back),
          onPressed: () {
            if (_step == 0) {
              context.go('/dashboard');
            } else {
              setState(() => _step--);
            }
          },
        ),
      ),
      body: Column(
        children: [
          _StepIndicator(current: _step, total: 3),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: switch (_step) {
                0 => _StepProduct(
                    type: _type,
                    product: _product,
                    quantity: _quantityController,
                    onTypeChanged: (t) => setState(() => _type = t),
                    onProductChanged: (p) => setState(() => _product = p),
                  ),
                1 => _StepReason(
                    reason: _reason,
                    comment: _commentController,
                    onReasonChanged: (r) => setState(() => _reason = r),
                  ),
                2 => _StepConfirm(
                    photo: _photo,
                    photoBytes: _photoBytes,
                    onPickPhoto: _pickPhoto,
                    type: _type,
                    product: _product,
                    quantity: _quantityController.text,
                    reason: _reason,
                    comment: _commentController.text,
                  ),
                _ => const SizedBox(),
              },
            ),
          ),
          _BottomBar(
            step: _step,
            canProceed: _canProceed(),
            submitting: _submitting,
            onNext: () {
              if (_step < 2) {
                setState(() => _step++);
              } else {
                _submit();
              }
            },
          ),
        ],
      ),
    );
  }

  String _stepTitle() => switch (_step) {
        0 => 'Товар',
        1 => 'Причина',
        2 => 'Подтверждение',
        _ => '',
      };

  bool _canProceed() => switch (_step) {
        0 => _product != null && _quantityController.text.isNotEmpty,
        1 => _reason != null,
        2 => _type == WriteoffType.vesovoy || _photo != null,
        _ => false,
      };
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.current, required this.total});
  final int current;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        children: List.generate(total, (i) {
          final active = i <= current;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < total - 1 ? 6 : 0),
              height: 4,
              decoration: BoxDecoration(
                color: active ? BahandiColors.green : BahandiColors.cardBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _StepProduct extends StatelessWidget {
  const _StepProduct({
    required this.type,
    required this.product,
    required this.quantity,
    required this.onTypeChanged,
    required this.onProductChanged,
  });
  final WriteoffType type;
  final String? product;
  final TextEditingController quantity;
  final ValueChanged<WriteoffType> onTypeChanged;
  final ValueChanged<String?> onProductChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionLabel('Тип товара'),
        const SizedBox(height: 8),
        _SegmentedToggle(
          options: const ['Штучный', 'Весовой'],
          selected: type == WriteoffType.shtuchny ? 0 : 1,
          onChanged: (i) => onTypeChanged(i == 0 ? WriteoffType.shtuchny : WriteoffType.vesovoy),
        ),
        const SizedBox(height: 24),
        _SectionLabel('Продукт'),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: product,
          hint: const Text('Выберите продукт'),
          decoration: const InputDecoration(),
          items: _products
              .map((p) => DropdownMenuItem(value: p, child: Text(p)))
              .toList(),
          onChanged: onProductChanged,
        ),
        const SizedBox(height: 24),
        _SectionLabel(type == WriteoffType.shtuchny ? 'Количество (штук)' : 'Масса (граммы)'),
        const SizedBox(height: 8),
        TextField(
          controller: quantity,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            suffixText: type == WriteoffType.shtuchny ? 'шт' : 'г',
          ),
        ),
      ],
    );
  }
}

class _StepReason extends StatelessWidget {
  const _StepReason({
    required this.reason,
    required this.comment,
    required this.onReasonChanged,
  });
  final String? reason;
  final TextEditingController comment;
  final ValueChanged<String?> onReasonChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionLabel('Причина списания'),
        const SizedBox(height: 12),
        ..._reasonCodes.map((code) {
          final selected = reason == code;
          return GestureDetector(
            onTap: () => onReasonChanged(code),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: selected ? BahandiColors.green.withValues(alpha: 0.08) : Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: selected ? BahandiColors.green : BahandiColors.cardBorder,
                  width: selected ? 1.5 : 1,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _reasonLabels[code]!,
                      style: GoogleFonts.golosText(
                        fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                        color: selected ? BahandiColors.green : BahandiColors.charcoal,
                      ),
                    ),
                  ),
                  if (selected) const Icon(Icons.check_circle, color: BahandiColors.green, size: 20),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: 24),
        _SectionLabel('Комментарий (необязательно)'),
        const SizedBox(height: 8),
        TextField(
          controller: comment,
          maxLines: 3,
          decoration: const InputDecoration(hintText: 'Дополнительные детали...'),
        ),
      ],
    );
  }
}

class _StepConfirm extends StatelessWidget {
  const _StepConfirm({
    required this.photo,
    required this.photoBytes,
    required this.onPickPhoto,
    required this.type,
    required this.product,
    required this.quantity,
    required this.reason,
    required this.comment,
  });

  final XFile? photo;
  final Uint8List? photoBytes;
  final VoidCallback onPickPhoto;
  final WriteoffType type;
  final String? product;
  final String quantity;
  final String? reason;
  final String comment;

  @override
  Widget build(BuildContext context) {
    final photoRequired = type == WriteoffType.shtuchny;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: BahandiColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Данные заявки',
                style: GoogleFonts.golosText(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: BahandiColors.charcoal,
                ),
              ),
              const SizedBox(height: 12),
              const Divider(height: 1, color: BahandiColors.cardBorder),
              const SizedBox(height: 12),
              _SummaryRow(
                icon: Icons.inventory_2_outlined,
                label: 'Продукт',
                value: product ?? '—',
              ),
              const SizedBox(height: 10),
              _SummaryRow(
                icon: type == WriteoffType.shtuchny
                    ? Icons.tag
                    : Icons.monitor_weight_outlined,
                label: type == WriteoffType.shtuchny ? 'Количество' : 'Масса',
                value: '$quantity ${type == WriteoffType.shtuchny ? 'шт' : 'г'}',
              ),
              const SizedBox(height: 10),
              _SummaryRow(
                icon: Icons.info_outline,
                label: 'Причина',
                value: _reasonLabels[reason] ?? '—',
              ),
              if (comment.isNotEmpty) ...[
                const SizedBox(height: 10),
                _SummaryRow(
                  icon: Icons.chat_bubble_outline,
                  label: 'Комментарий',
                  value: comment,
                ),
              ],
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Photo section
        _SectionLabel(photoRequired ? 'Фото (обязательно)' : 'Фото (необязательно)'),
        const SizedBox(height: 10),

        GestureDetector(
          onTap: onPickPhoto,
          child: Container(
            height: 200,
            decoration: BoxDecoration(
              color: BahandiColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: photo != null ? BahandiColors.green : BahandiColors.cardBorder,
                width: photo != null ? 1.5 : 1,
              ),
            ),
            child: photo != null && photoBytes != null
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(15),
                        child: Image.memory(photoBytes!, fit: BoxFit.cover),
                      ),
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: GestureDetector(
                          onTap: onPickPhoto,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.refresh, color: Colors.white, size: 14),
                                const SizedBox(width: 4),
                                Text(
                                  'Переснять',
                                  style: GoogleFonts.golosText(color: Colors.white, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.camera_alt_outlined,
                        size: 44,
                        color: BahandiColors.muted.withValues(alpha: 0.5),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Нажмите, чтобы сфотографировать',
                        style: GoogleFonts.golosText(
                          color: BahandiColors.muted,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
          ),
        ),

        const SizedBox(height: 20),

        // Warning banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: BahandiColors.orange.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: BahandiColors.orange.withValues(alpha: 0.2)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.lock_outline, size: 18, color: BahandiColors.orange),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Отправленную заявку нельзя изменить или удалить. Проверьте данные перед отправкой.',
                  style: GoogleFonts.golosText(
                    fontSize: 13,
                    color: BahandiColors.orange,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
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
                style: GoogleFonts.golosText(fontSize: 11, color: BahandiColors.muted),
              ),
              const SizedBox(height: 1),
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

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.step,
    required this.canProceed,
    required this.submitting,
    required this.onNext,
  });
  final int step;
  final bool canProceed;
  final bool submitting;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, MediaQuery.of(context).padding.bottom + 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: BahandiColors.cardBorder)),
      ),
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: (canProceed && !submitting) ? onNext : null,
          child: submitting
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Text(step == 2 ? 'Отправить заявку' : 'Далее'),
        ),
      ),
    );
  }
}

class _SegmentedToggle extends StatelessWidget {
  const _SegmentedToggle({
    required this.options,
    required this.selected,
    required this.onChanged,
  });
  final List<String> options;
  final int selected;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: BahandiColors.surface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: List.generate(options.length, (i) {
          final active = selected == i;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: active ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: active
                      ? [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 1))]
                      : null,
                ),
                child: Text(
                  options[i],
                  textAlign: TextAlign.center,
                  style: GoogleFonts.golosText(
                    fontWeight: active ? FontWeight.w600 : FontWeight.w400,
                    fontSize: 14,
                    color: active ? BahandiColors.charcoal : BahandiColors.muted,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.golosText(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: BahandiColors.charcoal,
      ),
    );
  }
}
