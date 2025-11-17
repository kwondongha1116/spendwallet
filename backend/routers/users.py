"""
Users 라우터 (간단한 데모용 CRUD 일부)
"""
from __future__ import annotations

from datetime import datetime
from typing import Dict

from fastapi import APIRouter

from backend.database import collections
from backend.schemas import UserCreate


router = APIRouter(prefix="/api/users", tags=["users"])


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
    # 이메일 단순 중복 방지 (데모)
    exists = await col.find_one({"email": payload.email})
    if exists:
        return {"_id": str(exists["_id"]), **{k: exists[k] for k in exists if k != "_id"}}
    res = await col.insert_one(doc)
    return {"_id": str(res.inserted_id), **doc}
