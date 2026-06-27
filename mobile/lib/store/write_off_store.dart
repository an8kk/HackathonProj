import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class WriteOffEntry {
  final String id;
  final String product;
  final String quantity;
  final String unit;
  final String reason;
  final String comment;
  final DateTime submittedAt;
  final String status;

  const WriteOffEntry({
    required this.id,
    required this.product,
    required this.quantity,
    required this.unit,
    required this.reason,
    required this.comment,
    required this.submittedAt,
    required this.status,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'product': product,
        'quantity': quantity,
        'unit': unit,
        'reason': reason,
        'comment': comment,
        'submittedAt': submittedAt.toIso8601String(),
        'status': status,
      };

  factory WriteOffEntry.fromJson(Map<String, dynamic> json) => WriteOffEntry(
        id: json['id'] as String,
        product: json['product'] as String,
        quantity: json['quantity'] as String,
        unit: json['unit'] as String,
        reason: json['reason'] as String,
        comment: json['comment'] as String,
        submittedAt: DateTime.parse(json['submittedAt'] as String),
        status: json['status'] as String,
      );
}

class WriteOffStore extends ChangeNotifier {
  static const _key = 'write_offs';

  final List<WriteOffEntry> _entries = [];

  List<WriteOffEntry> get entries => List.unmodifiable(_entries);

  int get count => _entries.length;

  int get approvedCount =>
      _entries.where((e) => e.status == 'approved').length;

  List<WriteOffEntry> get recent =>
      _entries.reversed.take(3).toList();

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _entries.clear();
      _entries.addAll(
        list.map((e) => WriteOffEntry.fromJson(e as Map<String, dynamic>)),
      );
      notifyListeners();
      return;
    }

    // First launch — seed realistic demo data so the UI isn't empty.
    final now = DateTime.now();
    final seeds = [
      WriteOffEntry(
        id: 'seed-1',
        product: 'Говяжья котлета',
        quantity: '3',
        unit: 'шт',
        reason: 'OVERCOOKED',
        comment: 'Пережарены при приготовлении',
        submittedAt: now.subtract(const Duration(hours: 8)),
        status: 'approved',
      ),
      WriteOffEntry(
        id: 'seed-2',
        product: 'Булочка бургерная',
        quantity: '5',
        unit: 'шт',
        reason: 'DAMAGED',
        comment: 'Помяты при доставке',
        submittedAt: now.subtract(const Duration(hours: 6, minutes: 30)),
        status: 'approved',
      ),
      WriteOffEntry(
        id: 'seed-3',
        product: 'Картофель фри',
        quantity: '350',
        unit: 'г',
        reason: 'RAW_WASTE',
        comment: '',
        submittedAt: now.subtract(const Duration(hours: 5)),
        status: 'rejected',
      ),
      WriteOffEntry(
        id: 'seed-4',
        product: 'Куриная котлета',
        quantity: '2',
        unit: 'шт',
        reason: 'EXPIRED',
        comment: 'Истёк срок хранения',
        submittedAt: now.subtract(const Duration(hours: 3, minutes: 45)),
        status: 'pending',
      ),
      WriteOffEntry(
        id: 'seed-5',
        product: 'Листья салата',
        quantity: '120',
        unit: 'г',
        reason: 'OTHER',
        comment: 'Потемнели края',
        submittedAt: now.subtract(const Duration(hours: 3)),
        status: 'pending',
      ),
    ];
    _entries.addAll(seeds);
    final seedPrefs = await SharedPreferences.getInstance();
    await seedPrefs.setString(
      _key,
      jsonEncode(_entries.map((e) => e.toJson()).toList()),
    );
    notifyListeners();
  }

  Future<void> add(WriteOffEntry entry) async {
    _entries.add(entry);
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(_entries.map((e) => e.toJson()).toList()),
    );
  }
}
