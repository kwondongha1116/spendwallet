"""Pydantic schemas for API requests/responses.

정리용 스키마 모음:
- UserCreate, UserOut
- BulkSpendingsRequest, SpendingDailyDoc
- DailyReportResponse, WeeklyReportResponse, MonthlyProfileResponse
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Dict

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: str
    display_name: str


class UserOut(BaseModel):
    id: str = Field(alias="_id")
    email: str
    display_name: str
    created_at: datetime


class SpendingItemInput(BaseModel):
    """벌크 입력 시, 각 항목의 입력 스키마"""

    memo: str
    amount: int = Field(ge=0)


class BulkSpendingsRequest(BaseModel):
    """벌크 입력 요청 바디
    - user_id: 사용자 식별자
    - items: 여러 소비 항목 (메모/금액)
    - date: 선택. 없으면 서버가 오늘로 처리
    - analyze: 선택. 기본 True (AI 분석 수행)
    """

    user_id: str
    items: List[SpendingItemInput]
    date: Optional[str] = None
    analyze: Optional[bool] = True


class SpendingItemAnalyzed(BaseModel):
    """AI 분석 후 항목 스키마 (DB 저장용)"""

    memo: str
    amount: int
    category: Optional[str] = None
    tags: List[str] = []
    confidence: Optional[float] = None


class SpendingDailyDoc(BaseModel):
    """spendings 컬렉션에 저장되는 일별 문서 스키마"""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    spent_at: str  # YYYY-MM-DD
    items: List[SpendingItemAnalyzed]
    total_amount: int
    ai_comment: Optional[str] = None
    created_at: datetime


class DailyReportResponse(BaseModel):
    total_amount: int
    chart_data: Dict[str, float]  # 태그별 비율 (0~1)
    ai_comment: Optional[str]


class WeeklyReportResponse(BaseModel):
    # 주간 리포트 응답
    totals: Dict[str, int]  # 카테고리별 합계
    deltas: Dict[str, float]  # 전주 대비 증감률 (-1~1 범위 가정)
    comment: str
    total_amount: Optional[int] = None  # 이번 주 총 소비


class MonthlyProfileResponse(BaseModel):
    type: str
    rationale: str
    advice: str


