from __future__ import annotations

import os
from datetime import datetime
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from database import collections
from routers.auth import _create_token


router = APIRouter(prefix="/api/auth/google", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.get("/login")
async def google_login():
  """구글 로그인 페이지로 리다이렉트"""
  if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
    raise HTTPException(status_code=500, detail="Google OAuth is not configured")

  auth_url = (
    "https://accounts.google.com/o/oauth2/v2/auth?"
    f"client_id={GOOGLE_CLIENT_ID}&"
    f"redirect_uri={GOOGLE_REDIRECT_URI}&"
    "response_type=code&"
    "scope=openid%20email%20profile"
  )
  return RedirectResponse(auth_url)


@router.get("/callback")
async def google_callback(code: str, request: Request):
  """Google OAuth 콜백 처리"""
  if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI):
    raise HTTPException(status_code=500, detail="Google OAuth is not configured")

  token_url = "https://oauth2.googleapis.com/token"

  data = {
    "code": code,
    "client_id": GOOGLE_CLIENT_ID,
    "client_secret": GOOGLE_CLIENT_SECRET,
    "redirect_uri": GOOGLE_REDIRECT_URI,
    "grant_type": "authorization_code",
  }

  async with httpx.AsyncClient() as client:
    token_res = await client.post(token_url, data=data)
    token_res.raise_for_status()
    token_json = token_res.json()

    access_token_google = token_json.get("access_token")
    if not access_token_google:
      raise HTTPException(status_code=400, detail="Failed to get access token from Google")

    # 구글 사용자 정보 가져오기
    userinfo_res = await client.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      headers={"Authorization": f"Bearer {access_token_google}"},
    )
    userinfo_res.raise_for_status()
    userinfo = userinfo_res.json()

  email = userinfo.get("email")
  name = userinfo.get("name") or "사용자"
  if not email:
    raise HTTPException(status_code=400, detail="Google user info has no email")

  # DB에 사용자 확인 / 생성
  cols = collections()
  users_col = cols["users"]
  user = await users_col.find_one({"email": email})
  if not user:
    res = await users_col.insert_one(
      {
        "email": email,
        "display_name": name,
        "created_at": datetime.utcnow(),
        "provider": "google",
      }
    )
    user_id = str(res.inserted_id)
  else:
    user_id = str(user["_id"])

  # 기존 JWT 포맷과 동일하게 토큰 발급
  access_token = _create_token(user_id, email)

  # 프론트엔드 콜백으로 리다이렉트
  frontend_base = FRONTEND_URL.rstrip("/")
  params = urlencode(
    {
      "token": access_token,
      "user_id": user_id,
      "email": email,
      "display_name": name,
    }
  )
  redirect_url = f"{frontend_base}/auth/callback?{params}"
  return RedirectResponse(redirect_url)

