"""Users 라우터

- POST /api/users : 단순 생성 (데모용)
- GET /api/users/{user_id} : 프로필 조회
- PUT /api/users/{user_id} : 프로필 수정 (이름/생년월일/전화번호/이메일)
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from database import collections
from schemas import UserCreate


router = APIRouter(prefix="/api/users", tags=["users"])


class UserProfileUpdate(BaseModel):
    display_name: str
    birthdate: str | None = None
    phone: str | None = None
    email: str


@router.post("")
async def create_user(payload: UserCreate):
    """사용자 생성 (데모)
    - 실 서비스에서는 OAuth2 연동 및 중복 체크 필요
    """
    col = collections()["users"]
    doc: Dict = {
        "email": payload.email,
        "display_name": payload.display_name,
        "created_at": datetime.utcnow(),
    }
    exists = await col.find_one({"email": payload.email})
    if exists:
        return {"id": str(exists["_id"]), **{k: v for k, v in exists.items() if k != "_id"}}
    res = await col.insert_one(doc)
    return {"id": str(res.inserted_id), **doc}


@router.get("/{user_id}")
async def get_user(user_id: str):
    col = collections()["users"]
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(doc["_id"]),
        "email": doc.get("email"),
        "display_name": doc.get("display_name"),
        "birthdate": doc.get("birthdate"),
        "phone": doc.get("phone"),
    }


@router.put("/{user_id}")
async def update_user(user_id: str, payload: UserProfileUpdate):
    col = collections()["users"]
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    doc = await col.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")

    await col.update_one(
        {"_id": oid},
        {"$set": {
            "display_name": payload.display_name,
            "birthdate": payload.birthdate,
            "phone": payload.phone,
            "email": payload.email,
        }},
    )

    updated = await col.find_one({"_id": oid})
    return {
        "id": str(updated["_id"]),
        "email": updated.get("email"),
        "display_name": updated.get("display_name"),
        "birthdate": updated.get("birthdate"),
        "phone": updated.get("phone"),
    }

