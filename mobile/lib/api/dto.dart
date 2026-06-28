/// Typed models mirroring the backend API contract (docs/API_CONTRACT.md).
///
/// Parsing is defensive: ids are coerced to strings and optional fields are
/// nullable so partial/unknown payloads never crash the UI.

String _str(dynamic v) => v == null ? '' : v.toString();
String? _strOrNull(dynamic v) => v?.toString();

num? _numOrNull(dynamic v) {
  if (v == null) return null;
  if (v is num) return v;
  return num.tryParse(v.toString());
}

DateTime? _dateOrNull(dynamic v) {
  if (v == null) return null;
  return DateTime.tryParse(v.toString());
}

class OutletDto {
  final String id;
  final String name;
  final String? address;

  const OutletDto({required this.id, required this.name, this.address});

  factory OutletDto.fromJson(Map<String, dynamic> json) => OutletDto(
        id: _str(json['id']),
        name: _str(json['name']),
        address: _strOrNull(json['address']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'address': address,
      };
}

class AppUserDto {
  final String id;
  final String name;
  final String role; // sender | reviewer | owner
  final OutletDto? outlet;
  final String? token;

  const AppUserDto({
    required this.id,
    required this.name,
    required this.role,
    this.outlet,
    this.token,
  });

  factory AppUserDto.fromJson(Map<String, dynamic> json) => AppUserDto(
        id: _str(json['id']),
        name: _str(json['name']),
        role: _str(json['role']),
        outlet: json['outlet'] is Map<String, dynamic>
            ? OutletDto.fromJson(json['outlet'] as Map<String, dynamic>)
            : null,
        token: _strOrNull(json['token']),
      );
}

class ProductDto {
  final String id;
  final String name;
  final String unit; // штуки | граммы | кг
  final num? costPerUnit;

  const ProductDto({
    required this.id,
    required this.name,
    required this.unit,
    this.costPerUnit,
  });

  factory ProductDto.fromJson(Map<String, dynamic> json) => ProductDto(
        id: _str(json['id']),
        name: _str(json['name']),
        unit: _str(json['unit']),
        costPerUnit: _numOrNull(json['cost_per_unit']),
      );
}

class PhotoDto {
  final String id;
  final String? metadataStatus; // valid | warning | invalid
  final List<String> validationErrors;

  const PhotoDto({
    required this.id,
    this.metadataStatus,
    this.validationErrors = const [],
  });

  factory PhotoDto.fromJson(Map<String, dynamic> json) => PhotoDto(
        id: _str(json['id']),
        metadataStatus: _strOrNull(json['metadata_status']),
        validationErrors: (json['validation_errors'] as List<dynamic>? ?? const [])
            .map((e) => e.toString())
            .toList(),
      );
}

class WriteOffDto {
  final String id;
  final String? outletId;
  final String? employeeId;
  final String? productId;
  final String? productName;
  final num? quantity;
  final String? unit; // backend unit string
  final String reasonCode; // DAMAGED | EXPIRED | OVERCOOKED | RAW_WASTE | DROPPED | OTHER
  final String deductionType; // NO_DEDUCTION | WITH_DEDUCTION
  final String status; // pending | approved | rejected
  final String? comment;
  final DateTime? createdAt;

  const WriteOffDto({
    required this.id,
    this.outletId,
    this.employeeId,
    this.productId,
    this.productName,
    this.quantity,
    this.unit,
    this.reasonCode = 'OTHER',
    this.deductionType = 'NO_DEDUCTION',
    this.status = 'pending',
    this.comment,
    this.createdAt,
  });

  factory WriteOffDto.fromJson(Map<String, dynamic> json) {
    final product = json['product'];
    return WriteOffDto(
      id: _str(json['id']),
      outletId: _strOrNull(json['outlet_id']),
      employeeId: _strOrNull(json['employee_id']),
      productId: _strOrNull(json['product_id']),
      productName: product is Map<String, dynamic>
          ? _strOrNull(product['name'])
          : _strOrNull(json['product_name']),
      quantity: _numOrNull(json['quantity']),
      unit: _strOrNull(json['unit']),
      reasonCode: _str(json['reason_code']).isEmpty ? 'OTHER' : _str(json['reason_code']),
      deductionType:
          _str(json['deduction_type']).isEmpty ? 'NO_DEDUCTION' : _str(json['deduction_type']),
      status: _str(json['status']).isEmpty ? 'pending' : _str(json['status']),
      comment: _strOrNull(json['comment']),
      createdAt: _dateOrNull(json['created_at']),
    );
  }
}
