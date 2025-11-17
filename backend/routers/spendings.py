"""
Spendings 라우터

기능:
- POST /api/spendings/bulk : 벌크 입력 + AI 분석 + 일별 문서 upsert
- GET  /api/spendings       : 날짜 범위 조회 (from, to)

DB 구조(일별 문서):
{
  _id, user_id, spent_at(YYYY-MM-DD),
  items: [{memo, amount, category, tags, confidence}],
  total_amount, ai_comment, created_at
}
"""
from __future__ import annotations

from datetime import datetime
import re
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Query

from backend.database import collections
from backend.schemas import (
    BulkSpendingsRequest,
    SpendingDailyDoc,
    SpendingItemAnalyzed,
)
from backend.ai_service import analyze_item, generate_daily_comment


router = APIRouter(prefix="/api/spendings", tags=["spendings"])


def _today_seoul_str() -> str:
    """오늘 날짜를 Asia/Seoul 기준 YYYY-MM-DD 문자열로 반환 (간단 처리)"""
    # 서버 TZ에 영향 받지 않도록 UTC 기준으로 날짜 계산을 권장.
    # 여기서는 단순화를 위해 UTC 날짜 사용 또는 로컬 타임존 사용 가능.
    return datetime.utcnow().strftime("%Y-%m-%d")


def _normalize_date(date_str: str | None) -> str:
    """사용자 입력 날짜 정규화
    - 허용: 'YYYY-MM-DD' 또는 'MM-DD' (현재 연도 보정)
    - 미입력(None/빈문자): 오늘 날짜 반환
    """
    if not date_str:
        return _today_seoul_str()
    date_str = date_str.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", date_str):
        return date_str
    if re.fullmatch(r"\d{2}-\d{2}", date_str):
        year = datetime.utcnow().strftime("%Y")
        return f"{year}-{date_str}"
    # 마지막 폴백: 파싱 실패 시 오늘로 저장 (사용자 편의)
    return _today_seoul_str()


@router.post("/bulk")
async def post_bulk_spendings(payload: BulkSpendingsRequest):
    """여러 소비 항목을 한 번에 저장하고, AI 분석 결과를 함께 기록합니다.
    - 동일 날짜 문서가 있으면 items에 append하고 total과 코멘트를 갱신합니다.
    - analyze=False면 카테고리/태그 없이 저장합니다.
    """
    col = collections()["spendings"]
    date_str = _normalize_date(payload.date)

    if not payload.items:
        raise HTTPException(status_code=400, detail="items is empty")

    analyzed_items: List[Dict] = []
    for it in payload.items:
        if payload.analyze:
            ai = analyze_item(it.memo, it.amount)
            analyzed_items.append(
                SpendingItemAnalyzed(
                    memo=it.memo,
                    amount=it.amount,
                    category=ai.get("category"),
                    tags=ai.get("tags", []),
                    confidence=ai.get("confidence"),
                ).model_dump()
            )
        else:
            analyzed_items.append(
                SpendingItemAnalyzed(memo=it.memo, amount=it.amount).model_dump()
            )

    # 기존 일별 문서 조회
    existing = await col.find_one({"user_id": payload.user_id, "spent_at": date_str})
    if existing:
        # items 이어붙이고 total 재계산
        new_items = (existing.get("items") or []) + analyzed_items
        new_total = sum(int(i.get("amount", 0)) for i in new_items)
        new_comment = generate_daily_comment(new_items)
        await col.update_one(
            {"_id": existing["_id"]},
            {"$set": {"items": new_items, "total_amount": new_total, "ai_comment": new_comment}},
        )
        return {"saved": len(analyzed_items), "daily": {"id": str(existing["_id"]), "date": date_str}}

    # 신규 문서 생성
    total_amount = sum(it.amount for it in payload.items)
    ai_comment = generate_daily_comment(analyzed_items)
    doc = SpendingDailyDoc(
        user_id=payload.user_id,
        spent_at=date_str,
        items=[SpendingItemAnalyzed(**i) for i in analyzed_items],
        total_amount=total_amount,
        ai_comment=ai_comment,
        created_at=datetime.utcnow(),
    ).model_dump(by_alias=True, exclude_none=True)
    res = await col.insert_one(doc)
    return {"saved": len(analyzed_items), "daily": {"id": str(res.inserted_id), "date": date_str}}


@router.get("")
async def list_spendings(
    user_id: str = Query(...),
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
):
    """날짜 범위 내 소비 항목 단순 조회 (캘린더/목록용)
    - 응답은 일별 문서의 items를 평탄화하여 반환합니다.
    """
    col = collections()["spendings"]
    cur = col.find({"user_id": user_id, "spent_at": {"$gte": from_date, "$lte": to_date}})
    result: List[Dict] = []
    async for d in cur:
        for it in d.get("items", []):
            result.append({
                "memo": it.get("memo"),
                "amount": it.get("amount"),
                "category": it.get("category"),
                "tags": it.get("tags"),
                "spentAt": d.get("spent_at"),
            })
    return {"items": result}
