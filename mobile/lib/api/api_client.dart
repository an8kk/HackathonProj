import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'api_config.dart';
import 'dto.dart';

/// Thrown when the backend returns a non-2xx status or `{success:false}`.
class ApiException implements Exception {
  final String code;
  final int statusCode;

  const ApiException(this.code, this.statusCode);

  @override
  String toString() => 'ApiException($statusCode): $code';
}

/// Thin HTTP client over the Bahandi/Qamqor backend.
///
/// Unwraps the `{success, data}` envelope and returns `data`; carries an
/// optional bearer token that is attached to every request once set.
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl})
      : _http = httpClient ?? http.Client(),
        _baseUrl = baseUrl ?? apiBaseUrl;

  final http.Client _http;
  final String _baseUrl;
  String? _token;

  String? get token => _token;
  set token(String? value) => _token = value;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null && _token!.isNotEmpty) 'Authorization': 'Bearer $_token',
      };

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final qp = <String, String>{};
    query?.forEach((key, value) {
      if (value != null) qp[key] = value.toString();
    });
    return Uri.parse('$_baseUrl$path')
        .replace(queryParameters: qp.isEmpty ? null : qp);
  }

  /// Validates the response and returns the unwrapped `data` payload.
  dynamic _unwrap(http.Response res) {
    dynamic body;
    if (res.body.isNotEmpty) {
      try {
        body = jsonDecode(res.body);
      } catch (_) {
        body = null;
      }
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      final code = body is Map && body['error'] != null
          ? body['error'].toString()
          : 'http_${res.statusCode}';
      throw ApiException(code, res.statusCode);
    }
    if (body is Map && body['success'] == false) {
      throw ApiException(
        (body['error'] ?? 'unknown_error').toString(),
        res.statusCode,
      );
    }
    if (body is Map && body.containsKey('data')) return body['data'];
    return body;
  }

  Future<dynamic> _get(String path, [Map<String, dynamic>? query]) async {
    final res = await _http.get(_uri(path, query), headers: _headers);
    return _unwrap(res);
  }

  Future<dynamic> _post(String path, Object? body,
      [Map<String, dynamic>? query]) async {
    final res = await _http.post(
      _uri(path, query),
      headers: _headers,
      body: body == null ? null : jsonEncode(body),
    );
    return _unwrap(res);
  }

  Future<dynamic> _patch(String path, Object? body) async {
    final res = await _http.patch(
      _uri(path),
      headers: _headers,
      body: body == null ? null : jsonEncode(body),
    );
    return _unwrap(res);
  }

  // ---- Auth ----------------------------------------------------------------

  Future<AppUserDto> login(String pin) async {
    final data = await _post('/auth/login', {'pin': pin});
    return AppUserDto.fromJson(data as Map<String, dynamic>);
  }

  // ---- Reference data ------------------------------------------------------

  Future<List<ProductDto>> listProducts() async {
    final data = await _get('/products') as List<dynamic>;
    return data
        .map((e) => ProductDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Map<String, dynamic>>> listOutlets() async {
    final data = await _get('/outlets') as List<dynamic>;
    return data.map((e) => e as Map<String, dynamic>).toList();
  }

  Future<List<Map<String, dynamic>>> listEmployees({String? outletId}) async {
    final data =
        await _get('/employees', {'outlet_id': outletId}) as List<dynamic>;
    return data.map((e) => e as Map<String, dynamic>).toList();
  }

  // ---- Photos --------------------------------------------------------------

  Future<PhotoDto> uploadPhoto({
    required String outletId,
    required String filename,
    required String contentBase64,
    String contentType = 'image/jpeg',
    DateTime? takenAt,
  }) async {
    final data = await _post(
      '/photos',
      {
        'filename': filename,
        'content_base64': contentBase64,
        'content_type': contentType,
        if (takenAt != null) 'taken_at': takenAt.toIso8601String(),
      },
      {'outlet_id': outletId},
    );
    return PhotoDto.fromJson(data as Map<String, dynamic>);
  }

  /// Convenience wrapper accepting raw image bytes.
  Future<PhotoDto> uploadPhotoBytes({
    required String outletId,
    required String filename,
    required Uint8List bytes,
    String contentType = 'image/jpeg',
    DateTime? takenAt,
  }) {
    return uploadPhoto(
      outletId: outletId,
      filename: filename,
      contentBase64: base64Encode(bytes),
      contentType: contentType,
      takenAt: takenAt,
    );
  }

  // ---- Write-offs ----------------------------------------------------------

  Future<WriteOffDto> createWriteOff({
    required String outletId,
    required String employeeId,
    required String productId,
    String? photoId,
    required num quantity,
    required String unit,
    required String reasonCode,
    required String deductionType,
    String? chargedEmployeeId,
    required String comment,
  }) async {
    final data = await _post('/write-offs', {
      'outlet_id': outletId,
      'employee_id': employeeId,
      'product_id': productId,
      if (photoId != null) 'photo_id': photoId,
      'quantity': quantity,
      'unit': unit,
      'reason_code': reasonCode,
      'deduction_type': deductionType,
      if (chargedEmployeeId != null) 'charged_employee_id': chargedEmployeeId,
      'comment': comment,
    });
    return WriteOffDto.fromJson(data as Map<String, dynamic>);
  }

  Future<List<WriteOffDto>> listWriteOffs({String? status, String? employeeId}) async {
    final data = await _get('/write-offs', {
      'status': status,
      'employee_id': employeeId,
    }) as List<dynamic>;
    return data
        .map((e) => WriteOffDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<WriteOffDto> getWriteOff(String id) async {
    final data = await _get('/write-offs/$id');
    return WriteOffDto.fromJson(data as Map<String, dynamic>);
  }

  Future<WriteOffDto> reviewWriteOff(
    String id, {
    required String reviewerId,
    required String decision, // approved | rejected
    String? rejectionReason,
  }) async {
    final data = await _patch('/write-offs/$id/review', {
      'reviewer_id': reviewerId,
      'decision': decision,
      if (rejectionReason != null) 'rejection_reason': rejectionReason,
    });
    return WriteOffDto.fromJson(data as Map<String, dynamic>);
  }

  void close() => _http.close();
}
