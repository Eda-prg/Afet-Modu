"""
auth-service — JWT, RBAC, register/login rotaları
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone

from ..database import get_db
from ..models import User

router = APIRouter()
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_change_in_prod")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
ALGORITHM = "HS256"


# ── Pydantic Şemaları ────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "customer"
    customer_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    customer_id: Optional[str] = None


# ── Yardımcı Fonksiyonlar ────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user: User) -> str:
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "customer_id": user.customer_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")


# ── Dependency: Geçerli kullanıcı ────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return decode_token(credentials.credentials)

def require_role(*roles: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
        return user
    return checker


# ── Rotalar ──────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # E-posta kontrolü
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu e-posta adresi zaten kayıtlı")

    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Şifre en az 8 karakter olmalıdır")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
        customer_id=req.customer_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at,
    }


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Hatalı e-posta veya şifre")

    token = create_token(user)
    return TokenResponse(
        access_token=token,
        expires_in=JWT_EXPIRE_MINUTES * 60,
        role=user.role,
        customer_id=user.customer_id,
    )


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["sub"],
        "email": user["email"],
        "role": user["role"],
        "customer_id": user.get("customer_id"),
    }
