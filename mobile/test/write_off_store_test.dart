import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bahandi_reporter/api/api_client.dart';
import 'package:bahandi_reporter/store/write_off_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('submit POSTs /photos then /write-offs with the expected body', () async {
    final requests = <http.Request>[];
    final bodies = <String>[];

    final mock = MockClient((request) async {
      requests.add(request);
      bodies.add(request.body);

      if (request.url.path == '/photos') {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {'id': 'photo-1', 'metadata_status': 'valid'},
          }),
          201,
          headers: {'content-type': 'application/json'},
        );
      }
      if (request.url.path == '/write-offs') {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {'id': 'wo-1', 'status': 'pending'},
          }),
          201,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response(
        jsonEncode({'success': false, 'error': 'not_found'}),
        404,
        headers: {'content-type': 'application/json'},
      );
    });

    final api = ApiClient(httpClient: mock);
    final store = WriteOffStore(api);

    final entry = await store.submit(
      outletId: 'out-1',
      employeeId: 'emp-1',
      productId: 'prod-1',
      productName: 'Говяжья котлета',
      quantity: '3',
      displayUnit: 'шт',
      reasonCode: 'DAMAGED',
      deductionType: 'NO_DEDUCTION',
      comment: 'Помяты при доставке полностью',
      photoBytes: Uint8List.fromList([1, 2, 3, 4]),
    );

    // Photo upload happens first, then the write-off creation.
    expect(requests[0].url.path, '/photos');
    expect(requests[0].url.queryParameters['outlet_id'], 'out-1');
    expect(requests[1].url.path, '/write-offs');

    final writeOffBody = jsonDecode(bodies[1]) as Map<String, dynamic>;
    expect(writeOffBody['outlet_id'], 'out-1');
    expect(writeOffBody['employee_id'], 'emp-1');
    expect(writeOffBody['product_id'], 'prod-1');
    expect(writeOffBody['photo_id'], 'photo-1');
    expect(writeOffBody['quantity'], 3);
    expect(writeOffBody['unit'], 'штуки');
    expect(writeOffBody['reason_code'], 'DAMAGED');
    expect(writeOffBody['deduction_type'], 'NO_DEDUCTION');

    // Successful sync updates the entry with the server id and clears the queue.
    expect(entry.id, 'wo-1');
    expect(store.hasPendingSync, isFalse);
  });

  test('submit keeps the entry queued when the backend is unreachable',
      () async {
    final mock = MockClient((request) async {
      return http.Response(
        jsonEncode({'success': false, 'error': 'server_error'}),
        500,
        headers: {'content-type': 'application/json'},
      );
    });

    final api = ApiClient(httpClient: mock);
    final store = WriteOffStore(api);

    final entry = await store.submit(
      outletId: 'out-1',
      employeeId: 'emp-1',
      productId: 'prod-1',
      productName: 'Соус',
      quantity: '1',
      displayUnit: 'шт',
      reasonCode: 'OTHER',
      deductionType: 'NO_DEDUCTION',
      comment: 'Тестовый комментарий',
      photoBytes: Uint8List.fromList([9, 9, 9]),
    );

    // The entry remains locally with its temporary id and stays queued.
    expect(entry.synced, isFalse);
    expect(store.hasPendingSync, isTrue);
    expect(store.entries.any((e) => e.product == 'Соус'), isTrue);
  });
}
