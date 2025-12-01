from __future__ import annotations

from typing import Dict, List, Optional

import requests
from fastapi import APIRouter

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _get_price_series(symbol: str) -> Optional[List[float]]:
  """
  Yahoo Finance chart 엔드포인트를 직접 호출해서
  최근 7일 종가 배열을 반환한다.
  """
  url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
  params = {"range": "7d", "interval": "1d"}

  try:
    res = requests.get(url, params=params, timeout=5)
    res.raise_for_status()
    data = res.json()
  except Exception:
    return None

  result = (data.get("chart") or {}).get("result")
  if not result:
    return None

  try:
    closes = result[0]["indicators"]["quote"][0]["close"]
  except (KeyError, IndexError, TypeError):
    return None

  cleaned = [round(c, 2) for c in closes if c is not None]
  return cleaned or None


@router.get("/summary")
def get_market_summary() -> Dict[str, Dict]:
  """이번 주 주요 지수 요약 (가격, 변동률, 7일 추세)"""
  tickers = {
    "코스피": "^KS11",
    "나스닥": "^IXIC",
    "달러/원": "USDKRW=X",
  }

  summary: Dict[str, Dict] = {}

  for name, symbol in tickers.items():
    closes = _get_price_series(symbol)
    if not closes or len(closes) < 2:
      continue

    current = closes[-1]
    prev = closes[0]
    try:
      change = round(((current - prev) / prev) * 100, 2)
    except ZeroDivisionError:
      change = 0.0

    summary[name] = {
      "price": current,
      "change": change,
      "trend": closes,
    }

  return {"indices": summary}

