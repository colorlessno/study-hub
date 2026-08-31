from __future__ import annotations


class AppError(Exception):
    def __init__(self, error_code: str, message: str, status_code: int, details: dict | None = None):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class ValidationAppError(AppError):
    def __init__(self, error_code: str, message: str, details: dict | None = None):
        super().__init__(error_code, message, 422, details)


class NotFoundAppError(AppError):
    def __init__(self, error_code: str, message: str, details: dict | None = None):
        super().__init__(error_code, message, 404, details)


class ConflictAppError(AppError):
    def __init__(self, error_code: str, message: str, details: dict | None = None):
        super().__init__(error_code, message, 409, details)


class ExternalServiceError(AppError):
    def __init__(self, error_code: str, message: str, status_code: int = 504, details: dict | None = None):
        super().__init__(error_code, message, status_code, details)
