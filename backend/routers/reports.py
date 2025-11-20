"""Reports 라우터

기능:
- GET /api/reports/daily?user_id&date=YYYY-MM-DD
- GET /api/reports/weekly?user_id&week=YYYY-WW (주 시작: 월요일)
- GET /api/reports/monthly?user_id&month=YYYY-MM

일간: 태그 비율 계산 + 저장된 코멘트 반환
주간: 카테고리 합계 + 전주 대비 증감률 + AI 코멘트
월간: 소비자 타입/요약/조언, 월간 합계가 바뀔 때만 재분석
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict

from fastapi import APIRouter, HTTPException, Query

from database import collections
from schemas import DailyReportResponse, WeeklyReportResponse, MonthlyProfileResponse
from ai_service import generate_weekly_comment, generate_monthly_profile


router = APIRouter(prefix="/api/reports", tags=["reports"])


def _week_range_from_iso(week_str: str) -> tuple[str, str]:
    """입력: YYYY-WW → 월요일 시작 ~ 일요일 종료 날짜 문자열 반환"""
    try:
        year, wk = week_str.split("-W")
        year_i = int(year)
        week_i = int(wk)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid week format, expected YYYY-WW")

    # ISO 주 시작 월요일 기준 날짜 계산
    jan4 = datetime(year_i, 1, 4)
    start = jan4 + timedelta(weeks=week_i - 1, days=-jan4.weekday())
    end = start + timedelta(days=6)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


@router.get("/daily", response_model=DailyReportResponse)
async def get_daily_report(user_id: str = Query(...), date: str = Query(...)):
    """일간 리포트
    - spendings 컬렉션에서 해당 날짜 문서를 찾고 태그 비율/코멘트를 반환.
    """
    col = collections()["spendings"]
    doc = await col.find_one({"user_id": user_id, "spent_at": date})
    if not doc:
        return DailyReportResponse(total_amount=0, chart_data={}, ai_comment="기록이 없습니다.")

    items = doc.get("items", [])
    tag_total: Dict[str, int] = {}
    total = 0
    for it in items:
        amt = int(it.get("amount", 0))
        total += amt
        for tag in it.get("tags", []) or []:
            tag_total[tag] = tag_total.get(tag, 0) + amt

    chart: Dict[str, float] = {}
    if total > 0:
        chart = {k: v / total for k, v in tag_total.items()}

    return DailyReportResponse(
        total_amount=int(doc.get("total_amount", total)),
        chart_data=chart,
        ai_comment=doc.get("ai_comment"),
    )


@router.get("/weekly", response_model=WeeklyReportResponse)
async def get_weekly_report(user_id: str = Query(...), week: str = Query(...)):
    """주간 리포트
    - 해당 주 범위의 spendings 문서를 합산해 카테고리 totals 계산
    - 전주 대비 증감률 deltas 계산
    - AI 코멘트를 생성하고 weekly_reports에 캐시
    """
    spend_col = collections()["spendings"]
    weekly_col = collections()["weekly_reports"]

    start, end = _week_range_from_iso(week)
    prev_start_dt = (datetime.strptime(start, "%Y-%m-%d") - timedelta(days=7))
    prev_end_dt = (datetime.strptime(end, "%Y-%m-%d") - timedelta(days=7))
    prev_start, prev_end = prev_start_dt.strftime("%Y-%m-%d"), prev_end_dt.strftime("%Y-%m-%d")

    async def _aggregate_category_sum(s: str, e: str) -> Dict[str, int]:
        cur = spend_col.find({"user_id": user_id, "spent_at": {"$gte": s, "$lte": e}})
        cat_sum: Dict[str, int] = {}
        async for d in cur:
            for it in d.get("items", []):
                cat = (it.get("category") or "기타")
                cat_sum[cat] = cat_sum.get(cat, 0) + int(it.get("amount", 0))
        return cat_sum

    this_totals = await _aggregate_category_sum(start, end)
    prev_totals = await _aggregate_category_sum(prev_start, prev_end)

    total_amount = sum(this_totals.values())

    deltas: Dict[str, float] = {}
    keys = set(this_totals.keys()) | set(prev_totals.keys())
    for k in keys:
        a = this_totals.get(k, 0)
        b = prev_totals.get(k, 0)
        if b == 0:
            deltas[k] = 1.0 if a > 0 else 0.0
        else:
            deltas[k] = (a - b) / b

    weekly_col_ref = weekly_col
    existing = await weekly_col_ref.find_one({"user_id": user_id, "week_start": start, "week_end": end})

    # 총액이 같으면 기존 코멘트를 재사용 (AI 재호출 방지)
    if existing and existing.get("total_amount") == total_amount:
        comment = existing.get("comment", "")
    else:
        summary = {"totals": this_totals, "deltas": deltas, "week": week}
        comment = generate_weekly_comment(summary)
        doc = {
            "user_id": user_id,
            "week_start": start,
            "week_end": end,
            "totals": this_totals,
            "deltas": deltas,
            "comment": comment,
            "total_amount": total_amount,
            "updated_at": datetime.utcnow(),
        }
        if existing:
            await weekly_col_ref.update_one({"_id": existing["_id"]}, {"$set": doc})
        else:
            await weekly_col_ref.insert_one({**doc, "created_at": datetime.utcnow()})

    return WeeklyReportResponse(totals=this_totals, deltas=deltas, comment=comment, total_amount=total_amount)


@router.get("/monthly", response_model=MonthlyProfileResponse)
async def get_monthly_profile(user_id: str = Query(...), month: str = Query(...)):
    """월간 리포트

    - month: YYYY-MM
    - 월간 소비 총액이 변경될 때만 AI 분석을 다시 수행하고,
      총액이 같으면 이전에 저장된 월간 타입/코멘트를 재사용한다.
    """
    spend_col = collections()["spendings"]
    prof_col = collections()["monthly_profiles"]

    if len(month) != 7 or month[4] != "-":
        raise HTTPException(status_code=400, detail="Invalid month format, expected YYYY-MM")
    start = f"{month}-01"
    end = f"{month}-31"

    # 태그/카테고리 집계
    tag_sum: Dict[str, int] = {}
    cat_sum: Dict[str, int] = {}
    cur = spend_col.find({"user_id": user_id, "spent_at": {"$gte": start, "$lte": end}})
    async for d in cur:
        for it in d.get("items", []):
            amt = int(it.get("amount", 0))
            cat = (it.get("category") or "기타")
            cat_sum[cat] = cat_sum.get(cat, 0) + amt
            for tag in it.get("tags", []) or []:
                tag_sum[tag] = tag_sum.get(tag, 0) + amt

    total_amt = sum(cat_sum.values())
    tags_ratio = {k: (v / total_amt if total_amt else 0.0) for k, v in tag_sum.items()}

    # 기존 프로필이 있고 총액이 같으면 재사용
    exists = await prof_col.find_one({"user_id": user_id, "month": month})
    if exists and exists.get("total_amount") == total_amt:
        return MonthlyProfileResponse(
            type=exists.get("type", ""),
            rationale=exists.get("rationale", ""),
            advice=exists.get("advice", ""),
        )

    # 총액이 바뀌었거나 프로필이 없으면 AI로 다시 계산
    aggregate = {"totals": cat_sum, "tags": tags_ratio, "month": month}
    prof = generate_monthly_profile(aggregate)

    doc = {
        "user_id": user_id,
        "month": month,
        "type": prof.get("label", prof.get("type")),
        "rationale": prof.get("rationale"),
        "advice": prof.get("advice"),
        "total_amount": total_amt,
        "summary": prof.get("summary"),
        "persona": prof.get("persona"),
        "updated_at": datetime.utcnow(),
    }
    if exists:
        await prof_col.update_one({"_id": exists["_id"]}, {"$set": doc})
    else:
        await prof_col.insert_one({**doc, "created_at": datetime.utcnow()})

    return MonthlyProfileResponse(
        type=doc["type"], rationale=doc["rationale"], advice=doc["advice"]
    )
