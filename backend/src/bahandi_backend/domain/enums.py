from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    SENDER = 'sender'
    REVIEWER = 'reviewer'
    OWNER = 'owner'


class DeductionType(StrEnum):
    NO_DEDUCTION = 'NO_DEDUCTION'
    WITH_DEDUCTION = 'WITH_DEDUCTION'


class WriteOffStatus(StrEnum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'


class MetadataStatus(StrEnum):
    VALID = 'valid'
    WARNING = 'warning'
    INVALID = 'invalid'


class ProductUnit(StrEnum):
    PIECES = 'штуки'
    GRAMS = 'граммы'
    KILOGRAMS = 'кг'


class ReasonCode(StrEnum):
    DAMAGED = 'DAMAGED'
    EXPIRED = 'EXPIRED'
    OVERCOOKED = 'OVERCOOKED'
    RAW_WASTE = 'RAW_WASTE'
    DROPPED = 'DROPPED'
    OTHER = 'OTHER'


class MovementType(StrEnum):
    OPENING_BALANCE = 'OPENING_BALANCE'
    SUPPLY = 'SUPPLY'
    SALE = 'SALE'
    WRITE_OFF = 'WRITE_OFF'
    COUNT_ADJUSTMENT = 'COUNT_ADJUSTMENT'
    TRANSFER = 'TRANSFER'


class IikoSyncStatus(StrEnum):
    PENDING = 'pending'
    SYNCED = 'synced'
    FAILED = 'failed'
    NOT_CONFIGURED = 'not_configured'
    CAPABILITY_MISSING = 'capability_missing'


class QrEntityType(StrEnum):
    OUTLET = 'outlet'
    PRODUCT = 'product'
    SHIFT = 'shift'
    WRITE_OFF_REQUEST = 'write_off_request'
