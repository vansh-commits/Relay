import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.services import auth_service

router = APIRouter()


class Credentials(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str | None
    is_guest: bool
    question_count: int
    question_limit: int


def _auth_response(user: User, token: str) -> AuthResponse:
    return AuthResponse(
        token=token,
        email=user.email,
        is_guest=user.is_guest,
        question_count=user.question_count,
        question_limit=settings.GUEST_QUESTION_LIMIT if user.is_guest else 0,
    )


@router.post("/signup", response_model=AuthResponse)
async def signup(body: Credentials, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    if not auth_service.is_valid_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(email=email, password_hash=auth_service.hash_password(body.password), is_guest=False)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = auth_service.create_access_token(user.id, is_guest=False)
    return _auth_response(user, token)


@router.post("/login", response_model=AuthResponse)
async def login(body: Credentials, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not user.password_hash or not auth_service.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = auth_service.create_access_token(user.id, is_guest=False)
    return _auth_response(user, token)


@router.post("/guest", response_model=AuthResponse)
async def guest(db: AsyncSession = Depends(get_db)):
    user = User(is_guest=True)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = auth_service.create_access_token(user.id, is_guest=True)
    return _auth_response(user, token)


@router.get("/me", response_model=AuthResponse)
async def me(authorization: str = Header(default=""), db: AsyncSession = Depends(get_db)):
    token = authorization.removeprefix("Bearer ").strip()
    payload = auth_service.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    user = await db.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=401, detail="Account not found.")
    return _auth_response(user, token)
