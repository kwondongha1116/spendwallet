from __future__ import annotations

from fastapi import APIRouter
import yfinance as yf


router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/summary")
def get_market_summary():
    """이번 주 주요 지수 요약 (가격, 변동률, 7일 추세)"""
    tickers = {
        "코스피": "^KS11",
        "나스닥": "^IXIC",
        "달러/원": "USDKRW=X",
    }

    summary: dict[str, dict] = {}

    for name, symbol in tickers.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="7d")
            if hist.empty:
                continue
            closes = hist["Close"].round(2).tolist()
            if len(closes) < 2:
                continue
            current = closes[-1]
            prev = closes[0]
            change = round(((current - prev) / prev) * 100, 2)
            summary[name] = {
                "price": float(current),
                "change": float(change),
                "trend": [float(c) for c in closes],
            }
        except Exception:
            continue

    return {"indices": summary}

