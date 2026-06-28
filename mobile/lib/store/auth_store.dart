import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/dto.dart';

class AppUser {
  final String id;
  final String name;
  final String role; // sender | reviewer | owner
  final OutletDto outlet;
  final String? token;

  const AppUser({
    required this.id,
    required this.name,
    required this.role,
    required this.outlet,
    this.token,
  });

  /// Display name of the user's home outlet.
  String get outletName => outlet.name;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'role': role,
        'outlet': outlet.toJson(),
        'token': token,
      };

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'].toString(),
        name: (json['name'] ?? '').toString(),
        role: (json['role'] ?? '').toString(),
        outlet: json['outlet'] is Map<String, dynamic>
            ? OutletDto.fromJson(json['outlet'] as Map<String, dynamic>)
            : OutletDto(
                id: (json['outlet_id'] ?? '').toString(),
                name: (json['outlet'] ?? '').toString(),
              ),
        token: json['token']?.toString(),
      );

  factory AppUser.fromDto(AppUserDto dto) => AppUser(
        id: dto.id,
        name: dto.name,
        role: dto.role,
        outlet: dto.outlet ?? const OutletDto(id: '', name: ''),
        token: dto.token,
      );

  String get roleLabel => switch (role) {
        'sender' => 'Сотрудник',
        'reviewer' => 'Отдел контроля',
        'owner' => 'Владелец',
        'cashier' => 'Кассир',
        'cook' => 'Повар',
        'supervisor' => 'Супервайзер',
        _ => role,
      };

  String get initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}';
    }
    return parts.isNotEmpty && parts[0].isNotEmpty ? parts[0][0] : '?';
  }
}

const allOutlets = [
  'Mega Silk Way',
  'Достык Плаза',
  'Хан Шатыр',
  'Есентай Молл',
  'Алматы Молл',
];

class AuthStore extends ChangeNotifier {
  AuthStore(this._api);

  final ApiClient _api;

  static const _userKey = 'current_user';
  static const _outletKey = 'current_outlet';
  static const _tokenKey = 'qamqor_token';

  AppUser? _user;
  String? _currentOutlet;
  String? _error;

  AppUser? get user => _user;
  bool get isLoggedIn => _user != null;
  String? get error => _error;

  /// Active outlet — may differ from profile outlet if user switched location.
  String get currentOutlet =>
      _currentOutlet ?? _user?.outlet.name ?? allOutlets.first;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token != null && token.isNotEmpty) _api.token = token;

    final raw = prefs.getString(_userKey);
    if (raw != null) {
      _user = AppUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      _currentOutlet = prefs.getString(_outletKey) ?? _user!.outlet.name;
      notifyListeners();
    }
  }

  Future<void> setOutlet(String outlet) async {
    _currentOutlet = outlet;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_outletKey, outlet);
  }

  /// Logs in by PIN. Returns the user on success, null on bad credentials
  /// or network failure (inspect [error] for the reason).
  Future<AppUser?> login(String pin) async {
    _error = null;
    try {
      final dto = await _api.login(pin);
      final user = AppUser.fromDto(dto);
      _user = user;
      _currentOutlet = user.outlet.name;
      if (user.token != null && user.token!.isNotEmpty) {
        _api.token = user.token;
      }
      notifyListeners();

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_userKey, jsonEncode(user.toJson()));
      await prefs.setString(_outletKey, user.outlet.name);
      if (user.token != null && user.token!.isNotEmpty) {
        await prefs.setString(_tokenKey, user.token!);
      }
      return user;
    } on ApiException catch (e) {
      _error = e.code;
      notifyListeners();
      return null;
    } catch (_) {
      _error = 'network_error';
      notifyListeners();
      return null;
    }
  }

  Future<void> logout() async {
    _user = null;
    _currentOutlet = null;
    _error = null;
    _api.token = null;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    await prefs.remove(_outletKey);
    await prefs.remove(_tokenKey);
  }

  /// Dev-only: wipe all local state so seeds reload fresh.
  Future<void> devReset() async {
    _user = null;
    _currentOutlet = null;
    _error = null;
    _api.token = null;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
