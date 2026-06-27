import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppUser {
  final String id;
  final String name;
  final String role;
  final String outlet;

  const AppUser({
    required this.id,
    required this.name,
    required this.role,
    required this.outlet,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'role': role,
        'outlet': outlet,
      };

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        name: json['name'] as String,
        role: json['role'] as String,
        outlet: json['outlet'] as String,
      );

  String get roleLabel => switch (role) {
        'cashier' => 'Кассир',
        'cook' => 'Повар',
        'reviewer' => 'Отдел контроля',
        'supervisor' => 'Супервайзер',
        _ => role,
      };

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}';
    return parts[0][0];
  }
}

const allOutlets = [
  'Mega Silk Way',
  'Достык Плаза',
  'Хан Шатыр',
  'Есентай Молл',
  'Алматы Молл',
];

// Mock employee directory — swap for API call when backend is ready
const _mockEmployees = [
  {'id': '1001', 'pin': '1234', 'name': 'Айгерим Сейткали', 'role': 'cashier', 'outlet': 'Mega Silk Way'},
  {'id': '1002', 'pin': '2222', 'name': 'Дамир Ахметов', 'role': 'cook', 'outlet': 'Mega Silk Way'},
  {'id': '1003', 'pin': '3333', 'name': 'Нурзат Бекова', 'role': 'cook', 'outlet': 'Достык Плаза'},
  {'id': '1004', 'pin': '4444', 'name': 'Санжар Ержанов', 'role': 'cashier', 'outlet': 'Достык Плаза'},
  {'id': '1005', 'pin': '5555', 'name': 'Мадина Касымова', 'role': 'cashier', 'outlet': 'Хан Шатыр'},
];

class AuthStore extends ChangeNotifier {
  static const _userKey = 'current_user';
  static const _outletKey = 'current_outlet';

  AppUser? _user;
  String? _currentOutlet;

  AppUser? get user => _user;
  bool get isLoggedIn => _user != null;

  /// Active outlet — may differ from profile outlet if user switched location.
  String get currentOutlet => _currentOutlet ?? _user?.outlet ?? allOutlets.first;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw != null) {
      _user = AppUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      _currentOutlet = prefs.getString(_outletKey) ?? _user!.outlet;
      notifyListeners();
    }
  }

  Future<void> setOutlet(String outlet) async {
    _currentOutlet = outlet;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_outletKey, outlet);
  }

  /// Returns the logged-in user on success, null if credentials are wrong.
  Future<AppUser?> login(String employeeId, String pin) async {
    await Future.delayed(const Duration(milliseconds: 500));

    final match = _mockEmployees.where(
      (e) => e['id'] == employeeId && e['pin'] == pin,
    ).firstOrNull;

    if (match == null) return null;

    final user = AppUser(
      id: match['id']!,
      name: match['name']!,
      role: match['role']!,
      outlet: match['outlet']!,
    );
    _user = user;
    _currentOutlet = user.outlet;
    notifyListeners();

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user.toJson()));
    await prefs.setString(_outletKey, user.outlet);

    return user;
  }

  Future<void> logout() async {
    _user = null;
    _currentOutlet = null;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await prefs.remove(_outletKey);
  }

  /// Dev-only: wipe all local state so seeds reload fresh.
  Future<void> devReset() async {
    _user = null;
    _currentOutlet = null;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
