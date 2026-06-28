from __future__ import annotations

from typing import Any

from .db import models


def _iso(value: Any) -> Any:
    return value.isoformat() if value is not None else None


def outlet_dict(outlet: models.Outlet) -> dict[str, Any]:
    return {
        'id': outlet.id,
        'name': outlet.name,
        'address': outlet.address,
        'iiko_store_id': outlet.iiko_store_id,
    }


def employee_dict(employee: models.Employee) -> dict[str, Any]:
    return {
        'id': employee.id,
        'name': employee.name,
        'role': employee.role,
        'active': employee.active,
        'outlet': outlet_dict(employee.outlet) if employee.outlet else None,
        'outlet_id': employee.outlet_id,
    }


def product_dict(product: models.Product) -> dict[str, Any]:
    return {
        'id': product.id,
        'name': product.name,
        'unit': product.unit,
        'cost_per_unit': product.cost_per_unit,
        'iiko_product_id': product.iiko_product_id,
    }


def photo_dict(photo: models.Photo) -> dict[str, Any]:
    return {
        'id': photo.id,
        'filename': photo.filename,
        'storage_key': photo.storage_key,
        'content_type': photo.content_type,
        'sha256_hash': photo.sha256_hash,
        'perceptual_hash': photo.perceptual_hash,
        'taken_at': _iso(photo.taken_at),
        'uploaded_at': _iso(photo.uploaded_at),
        'metadata_status': photo.metadata_status,
        'validation_errors': photo.validation_errors,
        'ai_analysis': photo.ai_analysis,
    }


def write_off_dict(request: models.WriteOffRequest) -> dict[str, Any]:
    return {
        'id': request.id,
        'outlet_id': request.outlet_id,
        'employee_id': request.employee_id,
        'product_id': request.product_id,
        'photo_id': request.photo_id,
        'quantity': request.quantity,
        'unit': request.unit,
        'reason_code': request.reason_code,
        'deduction_type': request.deduction_type,
        'charged_employee_id': request.charged_employee_id,
        'comment': request.comment,
        'status': request.status,
        'reviewer_id': request.reviewer_id,
        'rejection_reason': request.rejection_reason,
        'reviewed_at': _iso(request.reviewed_at),
        'created_at': _iso(request.created_at),
        'iiko_sync': {
            'status': request.iiko_sync_status,
            'external_id': request.iiko_external_id,
            'error': request.iiko_error,
        },
    }


def movement_dict(movement: models.InventoryMovement) -> dict[str, Any]:
    return {
        'id': movement.id,
        'outlet_id': movement.outlet_id,
        'product_id': movement.product_id,
        'movement_type': movement.movement_type,
        'quantity': movement.quantity,
        'source_request_id': movement.source_request_id,
        'external_source': movement.external_source,
        'created_at': _iso(movement.created_at),
    }


def norm_dict(norm: models.WasteNorm) -> dict[str, Any]:
    return {
        'id': norm.id,
        'product_id': norm.product_id,
        'outlet_id': norm.outlet_id,
        'max_waste_pct': norm.max_waste_pct,
        'effective_from': _iso(norm.effective_from),
        'effective_to': _iso(norm.effective_to),
    }


def qr_token_dict(token: models.QrToken) -> dict[str, Any]:
    return {
        'id': token.id,
        'token': token.token,
        'entity_type': token.entity_type,
        'entity_id': token.entity_id,
        'expires_at': _iso(token.expires_at),
    }
