"""
Reports 라우터

기능:
- GET /api/reports/daily?user_id&date=YYYY-MM-DD
- GET /api/reports/weekly?user_id&week=YYYY-WW (주 시작: 월요일)
- GET /api/reports/monthly?user_id&month=YYYY-MM

일간: 태그 비율 계산 + 저장된 코멘트 반환
주간: 카테고리 합계 + 전주 대비 증감률 + 코멘트
월간: 타입/근거/조언 (캐시 저장)
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List

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
    # reference: ISO week handling (using simple approach)
    jan4 = datetime(year_i, 1, 4)
    start = jan4 + timedelta(weeks=week_i - 1, days=-jan4.weekday())
    end = start + timedelta(days=6)
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


@router.get("/daily", response_model=DailyReportResponse)
async def get_daily_report(user_id: str = Query(...), date: str = Query(...)):
    """일간 리포트
    - spendings 문서에서 items를 가져와 태그 비율을 계산.
    - ai_comment는 문서에 저장된 값을 사용.
    """
    col = collections()["spendings"]
    doc = await col.find_one({"user_id": user_id, "spent_at": date})
    if not doc:
        return DailyReportResponse(total_amount=0, chart_data={}, ai_comment="기록이 없습니다.")

    items = doc.get("items", [])
    # 태그별 금액 합 (간단 지표)
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
    - 해당 주(월~일) 범위의 spendings 문서를 합산해 카테고리 totals 계산
    - 전주 대비 증감률 deltas 계산
    - 코멘트 생성 후 weekly_reports 컬렉션에 upsert
    """
    spend_col = collections()["spendings"]
    weekly_col = collections()["weekly_reports"]

    start, end = _week_range_from_iso(week)
    prev_start_dt = (datetime.strptime(start, "%Y-%m-%d") - timedelta(days=7))
    prev_end_dt = (datetime.strptime(end, "%Y-%m-%d") - timedelta(days=7))
    prev_start, prev_end = prev_start_dt.strftime("%Y-%m-%d"), prev_end_dt.strftime("%Y-%m-%d")

    # 합산 함수
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

    # deltas 계산 (전주 대비 증가율). 분모 0 방지
    deltas: Dict[str, float] = {}
    keys = set(this_totals.keys()) | set(prev_totals.keys())
    for k in keys:
        a = this_totals.get(k, 0)
        b = prev_totals.get(k, 0)
        if b == 0:
            deltas[k] = 1.0 if a > 0 else 0.0
        else:
            deltas[k] = (a - b) / b

    summary = {"totals": this_totals, "deltas": deltas, "week": week}
    comment = generate_weekly_comment(summary)

    # 캐시 저장 (upsert)
    existing = await weekly_col.find_one({"user_id": user_id, "week_start": start, "week_end": end})
    if existing:
        await weekly_col.update_one({"_id": existing["_id"]}, {"$set": {"totals": this_totals, "deltas": deltas, "comment": comment}})
    else:
        await weekly_col.insert_one(
            {
                "user_id": user_id,
                "week_start": start,
                "week_end": end,
                "totals": this_totals,
                "deltas": deltas,
                "comment": comment,
                "created_at": datetime.utcnow(),
            }
        )

    return WeeklyReportResponse(totals=this_totals, deltas=deltas, comment=comment)


@router.get("/monthly", response_model=MonthlyProfileResponse)
async def get_monthly_profile(user_id: str = Query(...), month: str = Query(...)):
    """월간 프로필
    - month: YYYY-MM
    - month의 일별 데이터를 집계하고 타입/근거/조언을 산출 후 monthly_profiles 컬렉션에 캐시.
    """
    spend_col = collections()["spendings"]
    prof_col = collections()["monthly_profiles"]

    # 월 범위 계산 (단순: YYYY-MM-01 ~ YYYY-MM-31 검색)
    if len(month) != 7 or month[4] != "-":
        raise HTTPException(status_code=400, detail="Invalid month format, expected YYYY-MM")
    start = f"{month}-01"
    end = f"{month}-31"

    # 태그/카테고리 간단 합산
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
    aggregate = {"totals": cat_sum, "tags": tags_ratio, "month": month}
    prof = generate_monthly_profile(aggregate)

    # 저장 (upsert by user_id+month)
    exists = await prof_col.find_one({"user_id": user_id, "month": month})
    doc = {
        "user_id": user_id,
        "month": month,
        "type": prof.get("label", prof.get("type")),
        "rationale": prof.get("rationale"),
        "advice": prof.get("advice"),
        "created_at": datetime.utcnow(),
    }
    if exists:
        await prof_col.update_one({"_id": exists["_id"]}, {"$set": doc})
    else:
        await prof_col.insert_one(doc)

    return MonthlyProfileResponse(
        type=doc["type"], rationale=doc["rationale"], advice=doc["advice"]
    )
