from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, resource: str, id: str):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} '{id}' not found")


class ConflictError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class ServiceError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
