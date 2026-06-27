import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
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
  const NewWriteoffScreen({super.key});

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
  File? _photo;
  bool _submitting = false;

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (picked != null) setState(() => _photo = File(picked.path));
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;
    // TODO: POST to /write-offs
    context.go('/dashboard');
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
                2 => _StepPhoto(
                    photo: _photo,
                    onPickPhoto: _pickPhoto,
                    type: _type,
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
        2 => 'Фото и подтверждение',
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
          value: product,
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

class _StepPhoto extends StatelessWidget {
  const _StepPhoto({
    required this.photo,
    required this.onPickPhoto,
    required this.type,
  });
  final File? photo;
  final VoidCallback onPickPhoto;
  final WriteoffType type;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionLabel(
          type == WriteoffType.shtuchny ? 'Фото (обязательно)' : 'Фото (необязательно)',
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: onPickPhoto,
          child: Container(
            height: 220,
            decoration: BoxDecoration(
              color: BahandiColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: photo != null ? BahandiColors.green : BahandiColors.cardBorder,
                width: photo != null ? 1.5 : 1,
              ),
            ),
            child: photo != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: Image.file(photo!, fit: BoxFit.cover, width: double.infinity),
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt_outlined, size: 48, color: BahandiColors.muted.withValues(alpha: 0.6)),
                      const SizedBox(height: 12),
                      Text(
                        'Нажмите, чтобы сфотографировать',
                        style: GoogleFonts.golosText(color: BahandiColors.muted, fontSize: 14),
                      ),
                    ],
                  ),
          ),
        ),
        if (photo != null) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onPickPhoto,
            icon: const Icon(Icons.refresh),
            label: const Text('Переснять'),
          ),
        ],
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: BahandiColors.surface,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Проверьте данные перед отправкой',
                style: GoogleFonts.golosText(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              const SizedBox(height: 8),
              Text(
                'Отправленную заявку нельзя изменить или удалить.',
                style: GoogleFonts.golosText(fontSize: 13, color: BahandiColors.muted),
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
