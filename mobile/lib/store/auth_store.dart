import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthStore extends ChangeNotifier {
  static const _keyLoginAt = 'auth_login_at';
  static const _sessionDuration = Duration(hours: 8);

  bool _loggedIn = false;
  bool get isLoggedIn => _loggedIn;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyLoginAt);
    if (raw != null) {
      final loginAt = DateTime.tryParse(raw);
      if (loginAt != null &&
          DateTime.now().difference(loginAt) < _sessionDuration) {
        _loggedIn = true;
        notifyListeners();
      }
    }
  }

  Future<void> login() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyLoginAt, DateTime.now().toIso8601String());
    _loggedIn = true;
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyLoginAt);
    _loggedIn = false;
    notifyListeners();
  }

  /// Clears all auth state and write-off data for dev reset.
  Future<void> devReset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _loggedIn = false;
    notifyListeners();
  }
}
