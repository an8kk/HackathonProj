from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from .domain.enums import DeductionType, ReasonCode


class LoginRequest(BaseModel):
    pin: str


class PhotoUploadRequest(BaseModel):
    filename: str
    content_base64: str
    content_type: str
    taken_at: datetime | None = None


class CreateWriteOffRequest(BaseModel):
    outlet_id: str
    employee_id: str
    product_id: str
    photo_id: str | None = None
    quantity: float = Field(gt=0)
    unit: str
    reason_code: ReasonCode
    deduction_type: DeductionType
    charged_employee_id: str | None = None
    comment: str = Field(min_length=10)

    @field_validator('charged_employee_id')
    @classmethod
    def deduction_requires_employee(cls, value: str | None, info: Any) -> str | None:
        if info.data.get('deduction_type') == DeductionType.WITH_DEDUCTION and not value:
            raise ValueError('charged_employee_id is required when deduction_type is WITH_DEDUCTION')
        return value


class ReviewWriteOffRequest(BaseModel):
    reviewer_id: str
    decision: str
    rejection_reason: str | None = None

    @field_validator('decision')
    @classmethod
    def decision_is_valid(cls, value: str) -> str:
        if value not in {'approved', 'rejected'}:
            raise ValueError('decision must be approved or rejected')
        return value


class CreateProductRequest(BaseModel):
    name: str
    unit: str
    cost_per_unit: float = Field(ge=0)
    norm_waste_pct: float = Field(ge=0, default=0)
    iiko_product_id: str | None = None


class UpdateProductRequest(BaseModel):
    name: str | None = None
    unit: str | None = None
    cost_per_unit: float | None = Field(default=None, ge=0)
    iiko_product_id: str | None = None


class CreateNormRequest(BaseModel):
    product_id: str
    outlet_id: str | None = None
    max_waste_pct: float = Field(ge=0)
    effective_from: datetime | None = None


class CreateOutletRequest(BaseModel):
    name: str
    address: str = ''
    iiko_store_id: str | None = None


class UpdateOutletRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    iiko_store_id: str | None = None


class CreateEmployeeRequest(BaseModel):
    outlet_id: str
    name: str
    role: str
    pin: str


class UpdateEmployeeRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    pin: str | None = None
    active: bool | None = None


class SupplyRequest(BaseModel):
    outlet_id: str
    product_id: str
    quantity: float = Field(gt=0)


class InventoryCountLineInput(BaseModel):
    product_id: str
    counted_quantity: float = Field(ge=0)


class InventoryCountRequest(BaseModel):
    outlet_id: str
    counted_by_id: str | None = None
    lines: list[InventoryCountLineInput]


class CreateQrTokenRequest(BaseModel):
    entity_type: str
    entity_id: str
    ttl_seconds: int | None = None


class PhotoAnalysisRequest(BaseModel):
    image_base64: str
    media_type: str = 'image/jpeg'
