from __future__ import annotations


class ServiceError(Exception):
    """Base class for domain/service errors with an HTTP status hint."""

    status_code = 400

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class NotFoundError(ServiceError):
    status_code = 404


class ConflictError(ServiceError):
    status_code = 409


class UnauthorizedError(ServiceError):
    status_code = 401
