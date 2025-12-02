from __future__ import annotations

from datetime import datetime, timedelta
import os
from typing import Dict, List

import requests
from fastapi import APIRouter, HTTPException, Query

from database import collections
from ai_service import _call_gpt  # 내부 유틸 재사용

router = APIRouter(prefix="/api/insights", tags=["insights"])


async def _get_user_top_category_this_week(user_id: str) -> str:
    """가장 최근 7일 기준 대표 소비 카테고리 한 개를 반환."""
    spend_col = collections()["spendings"]

    end_dt = datetime.utcnow()
    start_dt = end_dt - timedelta(days=7)
    start, end = start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")

    cur = spend_col.find({"user_id": user_id, "spent_at": {"$gte": start, "$lte": end}})
    cat_sum: Dict[str, int] = {}
    async for d in cur:
        for it in d.get("items", []):
            cat = (it.get("category") or "기타")
            cat_sum[cat] = cat_sum.get(cat, 0) + int(it.get("amount", 0) or 0)

    if not cat_sum:
        return "기본 생활비"

    # 가장 금액이 큰 카테고리 하나
    return max(cat_sum.items(), key=lambda x: x[1])[0]


@router.get("/week_news")
async def get_weekly_news_insight(user_id: str = Query(...)) -> Dict:
    """이번 주 주요 뉴스 요약 + 사용자의 대표 소비 카테고리를 가볍게 엮은 인사이트."""
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="NEWS_API_KEY is not configured")

    # 1) 뉴스API에서 한국 비즈니스 헤드라인 3개 정도 가져오기
    url = (
        "https://newsapi.org/v2/top-headlines?"
        "category=business&language=ko&country=kr&pageSize=5"
        f"&apiKey={api_key}"
    )

    try:
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch news: {e}")

    articles: List[Dict] = data.get("articles") or []
    headlines = [a.get("title", "").strip() for a in articles if a.get("title")][:3]

    # 2) 이번 주 대표 소비 카테고리
    top_category = await _get_user_top_category_this_week(user_id)

    # 3) GPT에게 분위기 + 소비 카테고리 한 문장 요청
    system_prompt = (
        "너는 사용자의 소비 리포트에 가볍게 덧붙일 '이번 주 이슈 브리핑'을 써주는 한국어 어시스턴트야. "
        "뉴스와 소비 사이의 인과관계를 과도하게 만들지 말고, 분위기를 연결하는 정도로만 자연스럽게 엮어줘."
    )
    user_prompt = f"""
아래는 이번 주 주요 뉴스 헤드라인들이야. 이 뉴스들의 전반적인 분위기를 한두 문장으로 짧게 요약하고,
사용자의 대표 소비 카테고리인 '{top_category}'와 부드럽게 엮어서
"요즘 세상 분위기 속 내 소비 느낌"을 한 문장으로 표현해줘.

뉴스 헤드라인:
- {headlines[0] if len(headlines) > 0 else ''}
- {headlines[1] if len(headlines) > 1 else ''}
- {headlines[2] if len(headlines) > 2 else ''}

출력 형식 (JSON 한 줄):
{{
  "summary": "이번 주 세계는 기술과 금융 소식으로 활기찼어요. 덕분에 나의 쇼핑도 조금은 들뜬 기분이네요.",
  "mood": "긍정적"
}}
"""

    raw = _call_gpt(system_prompt, user_prompt, max_tokens=300)

    insight: Dict = {"summary": "", "mood": "중립"}
    if raw:
        try:
            import json

            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                insight["summary"] = str(parsed.get("summary") or "").strip()
                insight["mood"] = str(parsed.get("mood") or "중립").strip()
        except Exception:
            # 파싱 실패 시 그냥 원문을 요약문으로 사용
            insight["summary"] = raw.strip()

    return {"headlines": headlines, "insight": insight, "top_category": top_category}

