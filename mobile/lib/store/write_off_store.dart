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
  final String writeOffType; // 'no_deduction' | 'with_deduction'
  final bool aiSuggestedType; // true if AI picked it, false if employee overrode
  final String? overrideExplanation; // set when employee overrides AI suggestion

  const WriteOffEntry({
    required this.id,
    required this.product,
    required this.quantity,
    required this.unit,
    required this.reason,
    required this.comment,
    required this.submittedAt,
    required this.status,
    this.writeOffType = 'no_deduction',
    this.aiSuggestedType = true,
    this.overrideExplanation,
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
        'writeOffType': writeOffType,
        'aiSuggestedType': aiSuggestedType,
        'overrideExplanation': overrideExplanation,
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
        writeOffType: json['writeOffType'] as String? ?? 'no_deduction',
        aiSuggestedType: json['aiSuggestedType'] as bool? ?? true,
        overrideExplanation: json['overrideExplanation'] as String?,
      );
}

class WriteOffStore extends ChangeNotifier {
  static const _key = 'write_offs';
  static const _seededKey = 'write_offs_seeded';

  final List<WriteOffEntry> _entries = [];

  List<WriteOffEntry> get entries => List.unmodifiable(_entries);

  int get count => _entries.length;

  int get approvedCount => _entries.where((e) => e.status == 'approved').length;

  List<WriteOffEntry> get recent => _entries.reversed.take(3).toList();

  WriteOffEntry? get lastEntry => _entries.isEmpty ? null : _entries.last;

  bool get hasSuspiciousCluster {
    if (_entries.length < 3) return false;
    final sorted = [..._entries]
      ..sort((a, b) => a.submittedAt.compareTo(b.submittedAt));
    for (var i = 0; i <= sorted.length - 3; i++) {
      final window =
          sorted[i + 2].submittedAt.difference(sorted[i].submittedAt);
      if (window.inMinutes < 10) return true;
    }
    return false;
  }

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

    // Only seed once — never re-seed if prefs were cleared via devReset
    final alreadySeeded = prefs.getBool(_seededKey) ?? false;
    if (alreadySeeded) {
      notifyListeners();
      return;
    }

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
        writeOffType: 'no_deduction',
        aiSuggestedType: true,
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
        writeOffType: 'no_deduction',
        aiSuggestedType: true,
      ),
      WriteOffEntry(
        id: 'seed-3',
        product: 'Картофель фри',
        quantity: '350',
        unit: 'г',
        reason: 'RAW_WASTE',
        comment: 'Остатки после закрытия смены',
        submittedAt: now.subtract(const Duration(hours: 5)),
        status: 'rejected',
        writeOffType: 'no_deduction',
        aiSuggestedType: true,
      ),
      WriteOffEntry(
        id: 'seed-4',
        product: 'Куриная котлета',
        quantity: '2',
        unit: 'шт',
        reason: 'EXPIRED',
        comment: 'Истёк срок хранения, не проверили',
        submittedAt: now.subtract(const Duration(hours: 3, minutes: 45)),
        status: 'pending',
        writeOffType: 'with_deduction',
        aiSuggestedType: false,
        overrideExplanation: 'Сотрудник не проверил срок годности вовремя',
      ),
      WriteOffEntry(
        id: 'seed-5',
        product: 'Листья салата',
        quantity: '120',
        unit: 'г',
        reason: 'OTHER',
        comment: 'Потемнели края, не соответствуют стандарту',
        submittedAt: now.subtract(const Duration(hours: 3)),
        status: 'pending',
        writeOffType: 'no_deduction',
        aiSuggestedType: true,
      ),
    ];

    _entries.addAll(seeds);
    await prefs.setBool(_seededKey, true);
    await prefs.setString(
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

  /// Dev-only: wipe all entries and the seed flag so seeds reload on next start.
  Future<void> devReset() async {
    _entries.clear();
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    await prefs.remove(_seededKey);
  }
}
