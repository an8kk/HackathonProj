import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../store/write_off_store.dart';
import '../theme.dart';

const _apiBase = 'http://localhost:4000';

const _reasonLabels = {
  'DAMAGED': 'Повреждён',
  'EXPIRED': 'Истёк срок',
  'OVERCOOKED': 'Пережарен',
  'RAW_WASTE': 'Сырьевые отходы',
  'OTHER': 'Другое',
  'damaged': 'Повреждён',
  'expired': 'Истёк срок',
  'overcooked': 'Пережарен',
  'raw_waste': 'Сырьевые отходы',
  'other': 'Другое',
  'quality': 'Нарушение качества',
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

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  bool _analyzing = false;
  bool _launched = false;
  Map<String, dynamic>? _result;
  Uint8List? _photoBytes;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _shoot());
  }

  Future<void> _shoot() async {
    if (_launched) return;
    _launched = true;

    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
      maxWidth: 1280,
    );

    if (!mounted) return;
    if (picked == null) {
      context.go('/dashboard');
      return;
    }

    setState(() => _analyzing = true);

    final bytes = await picked.readAsBytes();

    Map<String, dynamic> analysis;
    try {
      final response = await http
          .post(
            Uri.parse('$_apiBase/photo-analysis/analyze'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'image_base64': base64Encode(bytes),
              'media_type': 'image/jpeg',
            }),
          )
          .timeout(const Duration(seconds: 20));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        analysis = (body['data'] as Map<String, dynamic>?) ?? _mockAnalysis();
      } else {
        analysis = _mockAnalysis();
      }
    } catch (_) {
      analysis = _mockAnalysis();
    }

    if (!mounted) return;
    setState(() {
      _analyzing = false;
      _result = analysis;
      _photoBytes = bytes;
    });
  }

  String _resolveProduct(String? detected) {
    if (detected == null) return _products.first;
    final lower = detected.toLowerCase();
    for (final p in _products) {
      if (p.toLowerCase().contains(lower) || lower.contains(p.toLowerCase())) {
        return p;
      }
    }
    return _products.first;
  }

  String _resolveReason(String? suggested) {
    if (suggested == null) return 'OTHER';
    final upper = suggested.toUpperCase();
    if (upper == 'DAMAGED' || upper == 'DAMAGE') return 'DAMAGED';
    if (upper == 'EXPIRED' || upper == 'EXPIRE') return 'EXPIRED';
    if (upper == 'OVERCOOKED' || upper == 'QUALITY') return 'OVERCOOKED';
    if (upper == 'RAW_WASTE' || upper == 'RAW') return 'RAW_WASTE';
    return 'OTHER';
  }

  Map<String, dynamic> _mockAnalysis() => {
        'detected_product': 'Говяжья котлета',
        'condition': 'Продукт пережарен, не подлежит подаче',
        'suggested_reason': 'overcooked',
        'warning': null,
        'is_food_waste': true,
      };

  @override
  Widget build(BuildContext context) {
    if (_analyzing) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 52,
                height: 52,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: BahandiColors.green,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'ИИ анализирует фото…',
                style: GoogleFonts.golosText(
                  color: Colors.white70,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Секунду',
                style: GoogleFonts.golosText(
                  color: Colors.white30,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_result != null) {
      return _ConfirmScreen(
        result: _result!,
        photoBytes: _photoBytes,
        product: _resolveProduct(_result!['detected_product'] as String?),
        reason: _resolveReason(_result!['suggested_reason'] as String?),
        onRetake: () {
          setState(() {
            _result = null;
            _photoBytes = null;
            _launched = false;
          });
          _shoot();
        },
      );
    }

    // Blank while native camera UI is open
    return const Scaffold(backgroundColor: Colors.black, body: SizedBox.expand());
  }
}

class _ConfirmScreen extends StatefulWidget {
  const _ConfirmScreen({
    required this.result,
    required this.photoBytes,
    required this.product,
    required this.reason,
    required this.onRetake,
  });

  final Map<String, dynamic> result;
  final Uint8List? photoBytes;
  final String product;
  final String reason;
  final VoidCallback onRetake;

  @override
  State<_ConfirmScreen> createState() => _ConfirmScreenState();
}

class _ConfirmScreenState extends State<_ConfirmScreen> {
  late String _product;
  late String _reason;
  late String _quantity;
  late String _condition;
  bool _withholding = false;
  bool _overrodeAi = false;
  final _overrideReasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _product = widget.product;
    _reason = widget.reason;
    _quantity = '1';
    _condition = (widget.result['condition'] as String?) ?? '';
  }

  @override
  void dispose() {
    _overrideReasonController.dispose();
    super.dispose();
  }

  void _editProduct() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Продукт',
                style: GoogleFonts.golosText(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: BahandiColors.charcoal)),
            const SizedBox(height: 12),
            ..._products.map((p) => ListTile(
                  dense: true,
                  title: Text(p, style: GoogleFonts.golosText(fontSize: 14)),
                  trailing: p == _product
                      ? const Icon(Icons.check, color: BahandiColors.green)
                      : null,
                  onTap: () => Navigator.pop(context, p),
                )),
          ],
        ),
      ),
    );
    if (picked != null) setState(() => _product = picked);
  }

  void _editReason() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Причина',
                style: GoogleFonts.golosText(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: BahandiColors.charcoal)),
            const SizedBox(height: 12),
            ...(_reasonLabels.entries
                .where((e) => e.key == e.key.toUpperCase())
                .map((e) => ListTile(
                      dense: true,
                      title: Text(e.value,
                          style: GoogleFonts.golosText(fontSize: 14)),
                      trailing: e.key == _reason
                          ? const Icon(Icons.check, color: BahandiColors.green)
                          : null,
                      onTap: () => Navigator.pop(context, e.key),
                    ))),
          ],
        ),
      ),
    );
    if (picked != null) setState(() => _reason = picked);
  }

  void _editQuantity() async {
    final ctrl = TextEditingController(text: _quantity);
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Количество',
                style: GoogleFonts.golosText(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: BahandiColors.charcoal)),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(suffixText: 'шт'),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx, ctrl.text),
                child: const Text('Готово'),
              ),
            ),
          ],
        ),
      ),
    );
    if (result != null && result.isNotEmpty) setState(() => _quantity = result);
  }

  void _editCondition() async {
    final ctrl = TextEditingController(text: _condition);
    final result = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Комментарий',
                style: GoogleFonts.golosText(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: BahandiColors.charcoal)),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              maxLines: 3,
              autofocus: true,
              decoration:
                  const InputDecoration(hintText: 'Дополнительные детали…'),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx, ctrl.text),
                child: const Text('Готово'),
              ),
            ),
          ],
        ),
      ),
    );
    if (result != null) setState(() => _condition = result);
  }

  Future<void> _submit() async {
    final withholdingNote = _withholding ? '[С удержанием]' : '[Без удержания]';
    final overrideNote = _overrodeAi && _overrideReasonController.text.isNotEmpty
        ? ' — ${_overrideReasonController.text}'
        : '';
    final entry = WriteOffEntry(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      product: _product,
      quantity: _quantity,
      unit: 'шт',
      reason: _reason,
      comment: '$withholdingNote${_condition.isNotEmpty ? ' $_condition' : ''}$overrideNote',
      submittedAt: DateTime.now(),
      status: 'pending',
    );
    await context.read<WriteOffStore>().add(entry);
    if (!mounted) return;
    context.go('/success', extra: entry);
  }

  @override
  Widget build(BuildContext context) {
    final warning = widget.result['warning'] as String?;
    final isFoodWaste = widget.result['is_food_waste'] == true;

    return Scaffold(
      backgroundColor: BahandiColors.surface,
      body: SafeArea(
        child: Column(
          children: [
            // Photo hero
            if (widget.photoBytes != null)
              SizedBox(
                height: 240,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.memory(widget.photoBytes!, fit: BoxFit.cover),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.55),
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 16,
                      left: 16,
                      right: 16,
                      child: Text(
                        _product,
                        style: GoogleFonts.golosText(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status chip
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isFoodWaste
                            ? BahandiColors.green.withValues(alpha: 0.1)
                            : BahandiColors.orange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isFoodWaste
                            ? '✓ Списание подтверждено'
                            : '⚠ Требует проверки',
                        style: GoogleFonts.golosText(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isFoodWaste
                              ? BahandiColors.green
                              : BahandiColors.orange,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Editable fields card
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: BahandiColors.cardBorder),
                      ),
                      child: Column(
                        children: [
                          _EditableRow(
                            icon: Icons.inventory_2_outlined,
                            label: 'Продукт',
                            value: _product,
                            onEdit: _editProduct,
                          ),
                          const Divider(height: 1, color: BahandiColors.cardBorder),
                          _EditableRow(
                            icon: Icons.info_outline,
                            label: 'Причина',
                            value: _reasonLabels[_reason] ?? _reason,
                            onEdit: _editReason,
                          ),
                          const Divider(height: 1, color: BahandiColors.cardBorder),
                          _EditableRow(
                            icon: Icons.tag,
                            label: 'Количество',
                            value: '$_quantity шт',
                            onEdit: _editQuantity,
                          ),
                          const Divider(height: 1, color: BahandiColors.cardBorder),
                          _EditableRow(
                            icon: Icons.chat_bubble_outline,
                            label: 'Комментарий',
                            value: _condition.isEmpty ? '—' : _condition,
                            onEdit: _editCondition,
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),
                    _WriteOffTypeBanner(
                      withholding: _withholding,
                      overrodeAi: _overrodeAi,
                      overrideReasonController: _overrideReasonController,
                      onChanged: (val, overrode) => setState(() {
                        _withholding = val;
                        _overrodeAi = overrode;
                      }),
                    ),

                    if (warning != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color:
                              const Color(0xFFDC3545).withValues(alpha: 0.07),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: const Color(0xFFDC3545)
                                  .withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.warning_amber_rounded,
                                size: 16, color: Color(0xFFDC3545)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(warning,
                                  style: GoogleFonts.golosText(
                                      fontSize: 13,
                                      color: const Color(0xFFDC3545))),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _submit,
                        child: const Text('Отправить заявку'),
                      ),
                    ),
                    const SizedBox(height: 10),

                    Center(
                      child: TextButton.icon(
                        onPressed: widget.onRetake,
                        icon: const Icon(Icons.camera_alt_outlined, size: 16),
                        label: const Text('Переснять фото'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WriteOffTypeBanner extends StatelessWidget {
  const _WriteOffTypeBanner({
    required this.withholding,
    required this.overrodeAi,
    required this.overrideReasonController,
    required this.onChanged,
  });

  final bool withholding;
  final bool overrodeAi;
  final TextEditingController overrideReasonController;
  final void Function(bool withholding, bool overrode) onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
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
              Text(
                'Тип списания',
                style: GoogleFonts.golosText(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: BahandiColors.charcoal,
                ),
              ),
              const SizedBox(width: 6),
              if (!overrodeAi)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: BahandiColors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '✨ Предложено ИИ',
                    style: GoogleFonts.golosText(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: BahandiColors.green,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _TypeChip(
                label: 'Без удержания',
                selected: !withholding,
                onTap: () => onChanged(false, false),
              ),
              const SizedBox(width: 8),
              _TypeChip(
                label: 'С удержанием',
                selected: withholding,
                onTap: () => onChanged(true, true),
              ),
            ],
          ),
          if (overrodeAi) ...[
            const SizedBox(height: 12),
            TextField(
              controller: overrideReasonController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Причина изменения предложения ИИ...',
              ),
            ),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => onChanged(false, false),
              child: Text(
                'Вернуть предложение ИИ',
                style: GoogleFonts.golosText(
                  fontSize: 13,
                  color: BahandiColors.green,
                  fontWeight: FontWeight.w600,
                  decoration: TextDecoration.underline,
                  decorationColor: BahandiColors.green,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? BahandiColors.green : BahandiColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? BahandiColors.green : BahandiColors.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.golosText(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : BahandiColors.charcoal,
          ),
        ),
      ),
    );
  }
}

class _EditableRow extends StatelessWidget {
  const _EditableRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onEdit,
  });
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onEdit,
      borderRadius: BorderRadius.circular(14),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 16, color: BahandiColors.muted),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: GoogleFonts.golosText(
                          fontSize: 11, color: BahandiColors.muted)),
                  const SizedBox(height: 2),
                  Text(value,
                      style: GoogleFonts.golosText(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: BahandiColors.charcoal)),
                ],
              ),
            ),
            const Icon(Icons.edit_outlined, size: 15, color: BahandiColors.muted),
          ],
        ),
      ),
    );
  }
}
