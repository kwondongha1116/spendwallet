"""
인증 라우터 (회원가입/로그인/로그아웃)

- POST /api/auth/signup {email, password, display_name}
- POST /api/auth/login {email, password} -> {access_token, user}
- POST /api/auth/logout -> {ok: true}

JWT 기반 토큰. 프론트는 Authorization: Bearer <token> 로 전송.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import jwt

from backend.database import collections


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "120"))
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SignupReq(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _create_token(user_id: str, email: str) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@router.post("/signup")
async def signup(body: SignupReq):
    col = collections()["users"]
    # 이메일 중복 체크
    exists = await col.find_one({"email": body.email})
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "email": body.email,
        "display_name": body.display_name,
        "password_hash": pwd_ctx.hash(body.password),
        "created_at": datetime.utcnow(),
    }
    res = await col.insert_one(user_doc)
    token = _create_token(str(res.inserted_id), body.email)
    return {
        "access_token": token,
        "user": {"id": str(res.inserted_id), "email": body.email, "display_name": body.display_name},
    }


@router.post("/login")
async def login(body: LoginReq):
    col = collections()["users"]
    user = await col.find_one({"email": body.email})
    if not user or not pwd_ctx.verify(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _create_token(str(user["_id"]), user["email"])
    return {
        "access_token": token,
        "user": {"id": str(user["_id"]), "email": user["email"], "display_name": user.get("display_name")},
    }


@router.post("/logout")
async def logout():
    # 서버 측 상태 없음. 프론트에서 토큰 삭제.
    return {"ok": True}

