import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/dto.dart';

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
  final bool synced; // false while still queued for the backend

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
    this.synced = true,
  });

  WriteOffEntry copyWith({
    String? id,
    String? status,
    bool? synced,
  }) =>
      WriteOffEntry(
        id: id ?? this.id,
        product: product,
        quantity: quantity,
        unit: unit,
        reason: reason,
        comment: comment,
        submittedAt: submittedAt,
        status: status ?? this.status,
        writeOffType: writeOffType,
        aiSuggestedType: aiSuggestedType,
        overrideExplanation: overrideExplanation,
        synced: synced ?? this.synced,
      );

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
        'synced': synced,
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
        synced: json['synced'] as bool? ?? true,
      );

  factory WriteOffEntry.fromDto(WriteOffDto d) => WriteOffEntry(
        id: d.id,
        product: d.productName ?? d.productId ?? '',
        quantity: d.quantity == null ? '' : _trimNum(d.quantity!),
        unit: _displayUnit(d.unit),
        reason: d.reasonCode,
        comment: d.comment ?? '',
        submittedAt: d.createdAt ?? DateTime.now(),
        status: d.status,
        writeOffType:
            d.deductionType == 'WITH_DEDUCTION' ? 'with_deduction' : 'no_deduction',
        synced: true,
      );
}

String _trimNum(num n) =>
    n == n.roundToDouble() ? n.toInt().toString() : n.toString();

/// Maps the screen's display unit toggle to a backend unit string.
String backendUnit(String displayUnit) => switch (displayUnit) {
      'шт' => 'штуки',
      'г' => 'граммы',
      'кг' => 'кг',
      _ => displayUnit,
    };

String _displayUnit(String? backend) => switch (backend) {
      'штуки' => 'шт',
      'граммы' => 'г',
      'кг' => 'кг',
      _ => backend ?? '',
    };

class WriteOffStore extends ChangeNotifier {
  WriteOffStore(this._api);

  final ApiClient _api;

  static const _key = 'write_offs';
  static const _seededKey = 'write_offs_seeded';
  static const _pendingKey = 'write_offs_pending';

  final List<WriteOffEntry> _entries = [];

  /// Submissions not yet accepted by the backend (offline queue). Each map
  /// carries everything needed to retry the POST /photos + POST /write-offs.
  final List<Map<String, dynamic>> _pending = [];

  List<WriteOffEntry> get entries => List.unmodifiable(_entries);

  int get count => _entries.length;

  int get approvedCount => _entries.where((e) => e.status == 'approved').length;

  int get pendingSyncCount => _pending.length;

  bool get hasPendingSync => _pending.isNotEmpty;

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

    final pendingRaw = prefs.getString(_pendingKey);
    if (pendingRaw != null) {
      _pending
        ..clear()
        ..addAll((jsonDecode(pendingRaw) as List<dynamic>)
            .map((e) => Map<String, dynamic>.from(e as Map)));
    }

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
    await _persist();
    notifyListeners();
  }

  /// Submits a write-off: queues it locally, then POSTs the photo (if any) to
  /// `/photos` and creates the write-off via `/write-offs`. On network failure
  /// the entry stays queued (see [retryPending]). Returns the local entry,
  /// updated with the server id/status when the sync succeeds immediately.
  Future<WriteOffEntry> submit({
    required String outletId,
    required String employeeId,
    required String productId,
    required String productName,
    required String quantity,
    required String displayUnit, // 'шт' | 'г' | 'кг'
    required String reasonCode,
    required String deductionType, // NO_DEDUCTION | WITH_DEDUCTION
    String? chargedEmployeeId,
    required String comment,
    Uint8List? photoBytes,
    String? photoContentType,
    bool aiSuggestedType = true,
    String? overrideExplanation,
  }) async {
    final localId = DateTime.now().millisecondsSinceEpoch.toString();
    final entry = WriteOffEntry(
      id: localId,
      product: productName,
      quantity: quantity,
      unit: displayUnit,
      reason: reasonCode,
      comment: comment,
      submittedAt: DateTime.now(),
      status: 'pending',
      writeOffType:
          deductionType == 'WITH_DEDUCTION' ? 'with_deduction' : 'no_deduction',
      aiSuggestedType: aiSuggestedType,
      overrideExplanation: overrideExplanation,
      synced: false,
    );
    _entries.add(entry);

    final payload = <String, dynamic>{
      'entry_id': localId,
      'outlet_id': outletId,
      'employee_id': employeeId,
      'product_id': productId,
      'quantity': quantity,
      'unit': backendUnit(displayUnit),
      'reason_code': reasonCode,
      'deduction_type': deductionType,
      if (chargedEmployeeId != null) 'charged_employee_id': chargedEmployeeId,
      'comment': comment,
      if (photoBytes != null) 'photo_base64': base64Encode(photoBytes),
      'photo_content_type': photoContentType ?? 'image/jpeg',
    };
    _pending.add(payload);
    notifyListeners();
    await _persist();

    final synced = await _trySync(payload);
    return synced ?? entry;
  }

  /// Re-attempts every queued submission. Safe to call when back online.
  Future<void> retryPending() async {
    final queue = List<Map<String, dynamic>>.from(_pending);
    for (final payload in queue) {
      await _trySync(payload);
    }
  }

  /// Loads history for [employeeId] from the backend, falling back to the
  /// local cache on failure. Unsynced local entries are preserved.
  Future<void> loadHistory({required String employeeId}) async {
    try {
      final list = await _api.listWriteOffs(employeeId: employeeId);
      final server = list.map(WriteOffEntry.fromDto).toList();
      final pendingIds =
          _pending.map((p) => p['entry_id'] as String).toSet();
      final unsynced = _entries
          .where((e) => !e.synced || pendingIds.contains(e.id))
          .toList();
      _entries
        ..clear()
        ..addAll(server)
        ..addAll(unsynced)
        ..sort((a, b) => a.submittedAt.compareTo(b.submittedAt));
      notifyListeners();
      await _persist();
    } catch (_) {
      // Offline — keep the local cache as-is.
    }
  }

  Future<WriteOffEntry?> _trySync(Map<String, dynamic> payload) async {
    try {
      String? photoId;
      final b64 = payload['photo_base64'] as String?;
      if (b64 != null) {
        final photo = await _api.uploadPhoto(
          outletId: payload['outlet_id'] as String,
          filename: 'writeoff_${payload['entry_id']}.jpg',
          contentBase64: b64,
          contentType: payload['photo_content_type'] as String? ?? 'image/jpeg',
          takenAt: DateTime.now(),
        );
        photoId = photo.id;
      }

      final dto = await _api.createWriteOff(
        outletId: payload['outlet_id'] as String,
        employeeId: payload['employee_id'] as String,
        productId: payload['product_id'] as String,
        photoId: photoId,
        quantity: num.tryParse(
                (payload['quantity'] as String).replaceAll(',', '.')) ??
            0,
        unit: payload['unit'] as String,
        reasonCode: payload['reason_code'] as String,
        deductionType: payload['deduction_type'] as String,
        chargedEmployeeId: payload['charged_employee_id'] as String?,
        comment: payload['comment'] as String,
      );
      return _onSynced(payload['entry_id'] as String, dto);
    } catch (_) {
      // Keep queued for a later retry.
      return null;
    }
  }

  WriteOffEntry _onSynced(String localId, WriteOffDto dto) {
    final i = _entries.indexWhere((e) => e.id == localId);
    final updated = (i != -1 ? _entries[i] : WriteOffEntry.fromDto(dto))
        .copyWith(id: dto.id, status: dto.status, synced: true);
    if (i != -1) _entries[i] = updated;
    _pending.removeWhere((p) => p['entry_id'] == localId);
    notifyListeners();
    _persist();
    return updated;
  }

  /// Legacy local-only add (kept for callers that bypass the backend).
  Future<void> add(WriteOffEntry entry) async {
    _entries.add(entry);
    notifyListeners();
    await _persist();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(_entries.map((e) => e.toJson()).toList()),
    );
    await prefs.setString(_pendingKey, jsonEncode(_pending));
  }

  /// Dev-only: wipe all entries and the seed flag so seeds reload on next start.
  Future<void> devReset() async {
    _entries.clear();
    _pending.clear();
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    await prefs.remove(_pendingKey);
    await prefs.remove(_seededKey);
  }
}
