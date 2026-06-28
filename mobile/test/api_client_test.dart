import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:bahandi_reporter/api/api_client.dart';

void main() {
  group('ApiClient', () {
    test('login unwraps and parses the data envelope', () async {
      final mock = MockClient((request) async {
        expect(request.url.path, '/auth/login');
        expect(jsonDecode(request.body)['pin'], '1111');
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'id': 'emp-1',
              'name': 'Айгерим',
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
      final user = await api.login('1111');

      expect(user.id, 'emp-1');
      expect(user.role, 'sender');
      expect(user.outlet?.id, 'out-1');
      expect(user.token, 'jwt-token');
    });

    test('throws ApiException on {success:false}', () async {
      final mock = MockClient((request) async {
        return http.Response(
          jsonEncode({'success': false, 'error': 'invalid_pin'}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final api = ApiClient(httpClient: mock);

      expect(
        () => api.login('0000'),
        throwsA(isA<ApiException>()
            .having((e) => e.code, 'code', 'invalid_pin')),
      );
    });

    test('throws ApiException on 401', () async {
      final mock = MockClient((request) async {
        return http.Response(
          jsonEncode({'success': false, 'error': 'unauthorized'}),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      final api = ApiClient(httpClient: mock);

      expect(
        () => api.login('1111'),
        throwsA(isA<ApiException>()
            .having((e) => e.statusCode, 'statusCode', 401)
            .having((e) => e.code, 'code', 'unauthorized')),
      );
    });

    test('sends the bearer header once a token is set', () async {
      String? authHeader;
      final mock = MockClient((request) async {
        authHeader = request.headers['Authorization'];
        return http.Response(
          jsonEncode({'success': true, 'data': []}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final api = ApiClient(httpClient: mock);

      await api.listProducts();
      expect(authHeader, isNull);

      api.token = 'abc123';
      await api.listProducts();
      expect(authHeader, 'Bearer abc123');
    });
  });
}
