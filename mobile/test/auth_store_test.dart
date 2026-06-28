import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bahandi_reporter/api/api_client.dart';
import 'package:bahandi_reporter/store/auth_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('successful PIN login populates the current user', () async {
    final mock = MockClient((request) async {
      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'id': 'emp-1',
            'name': 'Дамир Ахметов',
            'role': 'sender',
            'outlet': {'id': 'out-1', 'name': 'Mega Silk Way'},
            'token': 'jwt-token',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    final api = ApiClient(httpClient: mock);
    final store = AuthStore(api);

    final user = await store.login('1111');

    expect(user, isNotNull);
    expect(store.isLoggedIn, isTrue);
    expect(store.user?.id, 'emp-1');
    expect(store.currentOutlet, 'Mega Silk Way');
    expect(api.token, 'jwt-token');
    expect(store.error, isNull);
  });

  test('a 401 surfaces an error and leaves the user null', () async {
    final mock = MockClient((request) async {
      return http.Response(
        jsonEncode({'success': false, 'error': 'invalid_pin'}),
        401,
        headers: {'content-type': 'application/json'},
      );
    });

    final api = ApiClient(httpClient: mock);
    final store = AuthStore(api);

    final user = await store.login('0000');

    expect(user, isNull);
    expect(store.isLoggedIn, isFalse);
    expect(store.user, isNull);
    expect(store.error, 'invalid_pin');
  });
}
