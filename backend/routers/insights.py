from __future__ import annotations

from datetime import datetime, timedelta
import os
from typing import Dict, List

import requests
from fastapi import APIRouter, HTTPException, Query

from database import collections
from ai_service import _call_gpt

router = APIRouter(prefix="/api/insights", tags=["insights"])


async def _get_user_top_category_this_week(user_id: str) -> str:
    """최근 7일 기준 대표 소비 카테고리 한 개를 반환."""
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


def _request_articles(url: str, params: Dict[str, str]) -> List[Dict[str, str]]:
    """NewsAPI에서 기사 {title,url} 리스트를 가져온다. 실패하면 빈 리스트."""
    try:
        res = requests.get(url, params=params, timeout=5)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        print(f"[NEWS] request error: {e}")
        return []

    if data.get("status") != "ok":
        print(
            f"[NEWS] status={data.get('status')} "
            f"code={data.get('code')} message={data.get('message')}"
        )
        return []

    articles = data.get("articles") or []
    result: List[Dict[str, str]] = []
    for a in articles:
        title = (a.get("title") or "").strip()
        if not title:
            continue
        url_val = (a.get("url") or "").strip()
        result.append({"title": title, "url": url_val})
    return result


def _fetch_headlines(api_key: str) -> List[Dict[str, str]]:
    """여러 전략으로 한국어 경제/일반 뉴스를 시도해서 최대 3개의 헤드라인을 반환."""
    base_top = "https://newsapi.org/v2/top-headlines"
    base_everything = "https://newsapi.org/v2/everything"

    # 1) 한국 비즈니스 헤드라인
    arts = _request_articles(
        base_top,
        {
            "country": "kr",
            "category": "business",
            "pageSize": "10",
            "apiKey": api_key,
        },
    )
    if arts:
        return arts[:3]

    # 2) 한국 전체 헤드라인 (카테고리 제한 없음)
    arts = _request_articles(
        base_top,
        {
            "country": "kr",
            "pageSize": "10",
            "apiKey": api_key,
        },
    )
    if arts:
        return arts[:3]

    # 3) everything 검색으로 한국어 경제/소비 관련 키워드
    arts = _request_articles(
        base_everything,
        {
            "q": "경제 OR 물가 OR 소비 OR 기술",
            "language": "ko",
            "pageSize": "10",
            "sortBy": "publishedAt",
            "apiKey": api_key,
        },
    )
    return arts[:3]


@router.get("/week_news")
async def get_weekly_news_insight(user_id: str = Query(...)) -> Dict:
    """
    이번 주 세계 뉴스 분위기 + 사용자의 대표 소비 카테고리를
    가볍게 엮은 인사이트를 반환한다.
    """
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="NEWS_API_KEY is not configured")

    headlines = _fetch_headlines(api_key)

    # 이번 주 대표 소비 카테고리
    top_category = await _get_user_top_category_this_week(user_id)

    # 주 단위 캐시 키 (같은 주/같은 뉴스면 같은 멘트 유지)
    year, week, _ = datetime.utcnow().isocalendar()
    week_key = f"{year}-W{week:02d}"

    news_col = collections()["news_insights"]
    existing = await news_col.find_one({"user_id": user_id, "week_key": week_key})
    if existing:
        if existing.get("headlines") == headlines and existing.get("top_category") == top_category:
            insight = existing.get("insight") or {}
            return {
                "headlines": headlines,
                "insight": {
                    "summary": str(insight.get("summary") or ""),
                    "mood": str(insight.get("mood") or "중립"),
                },
                "top_category": top_category,
            }

    # GPT에게 분위기 + 소비 카테고리 한 문장 요청
    system_prompt = (
        "너는 사용자의 소비 리포트에 가볍게 덧붙일 '이번 주 이슈 브리핑'을 써주는 한국어 어시스턴트야. "
        "뉴스와 소비 사이의 인과관계를 과도하게 만들지 말고, 분위기를 연결하는 정도로만 자연스럽게 엮어줘."
    )
    user_prompt = f"""
아래는 이번 주 주요 뉴스 헤드라인들이야. 이 뉴스들의 전반적인 분위기를 한두 문장으로 짧게 요약하고,
사용자의 대표 소비 카테고리인 '{top_category}'와 부드럽게 엮어서
"요즘 세상 분위기 속 내 소비 느낌"을 한 문장으로 표현해줘.

뉴스 헤드라인:
- {headlines[0]["title"] if len(headlines) > 0 else ''}
- {headlines[1]["title"] if len(headlines) > 1 else ''}
- {headlines[2]["title"] if len(headlines) > 2 else ''}

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
            # JSON 파싱 실패 시에는 원문 전체를 요약문으로 사용
            insight["summary"] = raw.strip()

    # 캐시에 저장 (같은 주/같은 뉴스면 재사용)
    doc = {
        "user_id": user_id,
        "week_key": week_key,
        "headlines": headlines,
        "top_category": top_category,
        "insight": insight,
        "updated_at": datetime.utcnow(),
    }
    if existing:
        await news_col.update_one({"_id": existing["_id"]}, {"$set": doc})
    else:
        await news_col.insert_one(doc)

    return {"headlines": headlines, "insight": insight, "top_category": top_category}

