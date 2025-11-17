"""
도메인 유틸/상수 (선택)
현재는 날짜 유틸 등 간단한 보조만 포함.
"""
from __future__ import annotations

from datetime import datetime


def iso_today() -> str:
    """UTC 기준 오늘 날짜 문자열 (YYYY-MM-DD)"""
    return datetime.utcnow().strftime("%Y-%m-%d")

