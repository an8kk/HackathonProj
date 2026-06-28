from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


def _uuid() -> str:
    return str(uuid4())


class Outlet(Base):
    __tablename__ = 'outlets'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, unique=True)
    address: Mapped[str] = mapped_column(String, default='')
    iiko_store_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Employee(Base):
    __tablename__ = 'employees'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    outlet_id: Mapped[str] = mapped_column(ForeignKey('outlets.id'))
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    pin_hash: Mapped[str] = mapped_column(String)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    outlet: Mapped[Outlet] = relationship(lazy='joined')


class Product(Base):
    __tablename__ = 'products'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, unique=True)
    unit: Mapped[str] = mapped_column(String)
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0.0)
    iiko_product_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class WasteNorm(Base):
    __tablename__ = 'waste_norms'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey('products.id'))
    outlet_id: Mapped[str | None] = mapped_column(ForeignKey('outlets.id'), nullable=True)
    max_waste_pct: Mapped[float] = mapped_column(Float)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    effective_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Photo(Base):
    __tablename__ = 'photos'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    filename: Mapped[str] = mapped_column(String)
    storage_key: Mapped[str] = mapped_column(String)
    content_type: Mapped[str] = mapped_column(String)
    sha256_hash: Mapped[str] = mapped_column(String, index=True)
    perceptual_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    taken_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    metadata_status: Mapped[str] = mapped_column(String)
    validation_errors: Mapped[list] = mapped_column(JSON, default=list)
    ai_analysis: Mapped[dict] = mapped_column(JSON, default=dict)


class WriteOffRequest(Base):
    __tablename__ = 'write_off_requests'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    outlet_id: Mapped[str] = mapped_column(ForeignKey('outlets.id'), index=True)
    employee_id: Mapped[str] = mapped_column(ForeignKey('employees.id'), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey('products.id'), index=True)
    photo_id: Mapped[str | None] = mapped_column(ForeignKey('photos.id'), nullable=True)
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String)
    reason_code: Mapped[str] = mapped_column(String)
    deduction_type: Mapped[str] = mapped_column(String)
    charged_employee_id: Mapped[str | None] = mapped_column(ForeignKey('employees.id'), nullable=True)
    comment: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, index=True, default='pending')
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey('employees.id'), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    iiko_sync_status: Mapped[str] = mapped_column(String, default='pending')
    iiko_external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    iiko_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class InventoryMovement(Base):
    __tablename__ = 'inventory_movements'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    outlet_id: Mapped[str] = mapped_column(ForeignKey('outlets.id'), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey('products.id'), index=True)
    movement_type: Mapped[str] = mapped_column(String, index=True)
    quantity: Mapped[float] = mapped_column(Float)
    source_request_id: Mapped[str | None] = mapped_column(String, nullable=True)
    external_source: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class InventoryCount(Base):
    __tablename__ = 'inventory_counts'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    outlet_id: Mapped[str] = mapped_column(ForeignKey('outlets.id'), index=True)
    counted_by_id: Mapped[str | None] = mapped_column(ForeignKey('employees.id'), nullable=True)
    counted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    lines: Mapped[list[InventoryCountLine]] = relationship(
        lazy='selectin', cascade='all, delete-orphan'
    )


class InventoryCountLine(Base):
    __tablename__ = 'inventory_count_lines'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    count_id: Mapped[str] = mapped_column(ForeignKey('inventory_counts.id'))
    product_id: Mapped[str] = mapped_column(ForeignKey('products.id'))
    counted_quantity: Mapped[float] = mapped_column(Float)


class QrToken(Base):
    __tablename__ = 'qr_tokens'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    token: Mapped[str] = mapped_column(String, unique=True, index=True)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditEvent(Base):
    __tablename__ = 'audit_events'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class IikoSyncJob(Base):
    __tablename__ = 'iiko_sync_jobs'

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String, index=True)
    operation: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, index=True, default='pending')
    attempts: Mapped[int] = mapped_column(default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
