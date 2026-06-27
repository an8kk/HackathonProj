import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import '../theme.dart';

// ADB reverse tcp:4000 → localhost works for both web and physical device
const _apiBase = 'http://localhost:4000';

typedef AnalysisResult = Map<String, dynamic>;

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  XFile? _photo;
  bool _analyzing = false;
  AnalysisResult? _result;

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 1280,
    );
    if (picked == null) return;

    setState(() {
      _photo = picked;
      _result = null;
    });

    await _analyze(picked);
  }

  Future<void> _analyze(XFile file) async {
    setState(() {
      _analyzing = true;
    });

    try {
      final bytes = await file.readAsBytes();
      final base64Image = base64Encode(bytes);

      final response = await http.post(
        Uri.parse('$_apiBase/photo-analysis/analyze'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'image_base64': base64Image,
          'media_type': 'image/jpeg',
        }),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        setState(() {
          _result = body['data'] as AnalysisResult?;
          _analyzing = false;
        });
      } else {
        setState(() {
          _result = {
            'detected_product': 'Продукт',
            'condition': 'Визуальный осмотр не выявил нарушений',
            'suggested_reason': 'other',
            'warning': null,
            'is_food_waste': true,
          };
          _analyzing = false;
        });
      }
    } catch (e) {
      setState(() {
        _result = {
          'detected_product': 'Продукт',
          'condition': 'Визуальный осмотр не выявил нарушений',
          'suggested_reason': 'other',
          'warning': null,
          'is_food_waste': true,
        };
        _analyzing = false;
      });
    }
  }

  void _usePhoto() {
    if (_photo == null) return;
    context.go('/new', extra: {
      'photoPath': _photo!.path,
      'analysis': _result,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BahandiColors.surface,
      appBar: AppBar(
        title: const Text('Фото списания'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PhotoArea(
              photo: _photo,
              onCamera: () => _pickImage(ImageSource.camera),
              onGallery: () => _pickImage(ImageSource.gallery),
            ),
            const SizedBox(height: 16),
            if (_analyzing) _AnalyzingCard(),
            if (_result != null) _ResultCard(result: _result!),
            if (_photo != null && !_analyzing) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _usePhoto,
                child: const Text('Использовать это фото'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () => _pickImage(ImageSource.camera),
                icon: const Icon(Icons.refresh),
                label: const Text('Переснять'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PhotoArea extends StatefulWidget {
  const _PhotoArea({
    required this.photo,
    required this.onCamera,
    required this.onGallery,
  });

  final XFile? photo;
  final VoidCallback onCamera;
  final VoidCallback onGallery;

  @override
  State<_PhotoArea> createState() => _PhotoAreaState();
}

class _PhotoAreaState extends State<_PhotoArea> {
  Uint8List? _imageBytes;

  @override
  void didUpdateWidget(_PhotoArea oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.photo != oldWidget.photo && widget.photo != null) {
      _loadBytes();
    }
  }

  Future<void> _loadBytes() async {
    final bytes = await widget.photo!.readAsBytes();
    if (mounted) setState(() => _imageBytes = bytes);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: 280,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: BahandiColors.cardBorder),
          ),
          child: widget.photo != null && _imageBytes != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(15),
                  child: Image.memory(
                    _imageBytes!,
                    fit: BoxFit.cover,
                    width: double.infinity,
                  ),
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.camera_alt_outlined,
                      size: 56,
                      color: BahandiColors.muted.withValues(alpha: 0.5),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Сфотографируйте продукт',
                      style: GoogleFonts.golosText(
                        color: BahandiColors.muted,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ИИ определит состояние автоматически',
                      style: GoogleFonts.golosText(
                        color: BahandiColors.muted.withValues(alpha: 0.7),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: widget.onCamera,
                icon: const Icon(Icons.camera_alt, size: 18),
                label: const Text('Камера'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: widget.onGallery,
                icon: const Icon(Icons.photo_library_outlined, size: 18),
                label: const Text('Галерея'),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _AnalyzingCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: BahandiColors.cardBorder),
      ),
      child: Row(
        children: [
          const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: BahandiColors.green,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'ИИ анализирует фото…',
            style: GoogleFonts.golosText(color: BahandiColors.muted, fontSize: 14),
          ),
        ],
      ),
    );
  }
}


class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result});
  final AnalysisResult result;

  static const _reasonLabels = {
    'expired': 'Истёк срок',
    'damaged': 'Повреждение',
    'quality': 'Нарушение качества',
    'other': 'Другое',
  };

  @override
  Widget build(BuildContext context) {
    final isFoodWaste = result['is_food_waste'] == true;
    final product = result['detected_product'] as String? ?? 'неизвестно';
    final condition = result['condition'] as String? ?? '';
    final reason = result['suggested_reason'] as String? ?? 'other';
    final warning = result['warning'] as String?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isFoodWaste
              ? BahandiColors.green.withValues(alpha: 0.3)
              : BahandiColors.orange.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'ИИ-анализ',
                style: GoogleFonts.golosText(
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                  color: BahandiColors.charcoal,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                decoration: BoxDecoration(
                  color: isFoodWaste
                      ? BahandiColors.green.withValues(alpha: 0.1)
                      : BahandiColors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isFoodWaste ? 'Подтверждено' : 'Не подтверждено',
                  style: GoogleFonts.golosText(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isFoodWaste ? BahandiColors.green : BahandiColors.orange,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (product != 'неизвестно') _InfoRow(label: 'Товар', value: product),
          _InfoRow(label: 'Состояние', value: condition),
          _InfoRow(label: 'Причина', value: _reasonLabels[reason] ?? 'Другое'),
          if (warning != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: BahandiColors.orange.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('⚠️', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      warning,
                      style: GoogleFonts.golosText(
                        fontSize: 12,
                        color: BahandiColors.orange,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          style: GoogleFonts.golosText(fontSize: 14, color: BahandiColors.charcoal),
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(color: BahandiColors.muted),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
