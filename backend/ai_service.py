"""
AI 분석 모듈 (OpenAI GPT-4o-mini 사용, 폴백 내장)

환경 변수:
- OPENAI_API_KEY: OpenAI API Key

제공 함수:
- analyze_item(memo, amount) -> {category, tags, confidence}
- generate_daily_comment(items) -> str
- generate_weekly_comment(summary) -> str
- generate_monthly_profile(aggregate) -> {type, rationale, advice}

네트워크/키 문제 등으로 OpenAI 호출 실패 시,
룰 기반(간단한 휴리스틱) 폴백을 사용하여 안정적으로 동작하도록 설계.
"""
from __future__ import annotations

import os
from typing import Dict, List, Optional

from dateutil.parser import parse as dtparse

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def _heuristic_category_and_tags(memo: str, amount: int) -> tuple[str, List[str], float]:
    """간단한 규칙 기반 카테고리/태그 추정 (폴백)
    - 실제 서비스에서는 OpenAI 호출 결과를 사용하고,
      실패 시에만 본 함수를 사용.
    """
    m = memo.lower()
    category = "기타"
    tags: List[str] = []
    # 매우 단순한 키워드 기반 분류
    if any(k in m for k in ["택시", "버스", "지하철", "교통", "kakaot", "uber"]):
        category = "교통"
        tags.append("시간절약")
    elif any(k in m for k in ["커피", "카페", "스타벅스", "커피빈"]):
        category = "식비"
        tags.append("보상")
    elif any(k in m for k in ["배달", "요기요", "배민", "배달의민족"]):
        category = "식비"
        tags.append("편의")
    elif any(k in m for k in ["점심", "저녁", "식사", "한식", "분식", "라면"]):
        category = "식비"
    elif any(k in m for k in ["넷플릭스", "구독", "멤버십", "유튜브"]):
        category = "구독"
        tags.append("취미")
    elif any(k in m for k in ["책", "강의", "토익", "토플", "인강"]):
        category = "교육"
        tags.append("투자")
    elif any(k in m for k in ["술", "맥주", "소주", "회식", "모임"]):
        category = "유흥"
        tags.append("사회")

    if amount >= 50000 and "고가" not in tags:
        tags.append("고가")

    confidence = 0.6 if category == "기타" else 0.8
    return category, list(dict.fromkeys(tags)), confidence


def analyze_item(memo: str, amount: int) -> Dict:
    """단일 소비 항목에 대한 AI 분석 수행.
    - OpenAI 호출을 시도하고 실패하면 규칙 기반 폴백을 사용.
    - 반환: {category, tags, confidence}
    """
    # OpenAI SDK 사용 (네트워크 실패 시 폴백)
    if OPENAI_API_KEY:
        try:
            # 최신 OpenAI SDK 스타일
            from openai import OpenAI  # type: ignore

            client = OpenAI(api_key=OPENAI_API_KEY)
            prompt = (
                "아래 소비 기록의 카테고리(한국어)와 동기 태그(최대 2개)를 추정하세요.\n"
                "출력은 JSON: {category, tags, confidence}.\n"
                f"메모: {memo}, 금액: {amount}"
            )
            # 가벼운 모델로 요청
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that outputs strict JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            content = resp.choices[0].message.content or "{}"
            # 매우 관대한 파서 (실패 시 폴백)
            import json

            data = json.loads(content)
            category = data.get("category")
            tags = data.get("tags", [])
            confidence = float(data.get("confidence", 0.75))
            if not category:
                raise ValueError("LLM missing category")
            return {
                "category": category,
                "tags": tags if isinstance(tags, list) else [],
                "confidence": confidence,
            }
        except Exception:
            # 폴백으로 전환
            pass

    cat, tags, conf = _heuristic_category_and_tags(memo, amount)
    return {"category": cat, "tags": tags, "confidence": conf}


def generate_daily_comment(items: List[Dict]) -> str:
    """일간 코멘트 생성
    - 태그/금액 기반으로 간단한 인사이트를 만들어 코멘트 구성.
    - OpenAI 호출 실패를 고려하여 규칙 기반 문장 생성.
    """
    # 태그별 금액 합산
    tag_amount: Dict[str, int] = {}
    total = 0
    for it in items:
        amt = int(it.get("amount", 0))
        total += amt
        for tag in it.get("tags", []) or []:
            tag_amount[tag] = tag_amount.get(tag, 0) + amt
    if total <= 0:
        return "오늘 기록이 없어요. 가볍게 한 건부터 적어볼까요?"

    top_tag = None
    if tag_amount:
        top_tag = max(tag_amount.items(), key=lambda x: x[1])[0]

    if OPENAI_API_KEY:
        try:
            from openai import OpenAI  # type: ignore

            client = OpenAI(api_key=OPENAI_API_KEY)
            prompt = (
                "아래 일간 소비 항목들을 보고 1-2문장의 코멘트를 한국어로 생성하세요.\n"
                "원칙: [관찰 1개] + [행동 제안 1개], 최대 180자, 존댓말, 비난 금지.\n"
                f"TopTag: {top_tag}, Total: {total}"
            )
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Coach persona. Polite. No blame."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            msg = resp.choices[0].message.content or ""
            if msg:
                return msg.strip()
        except Exception:
            pass

    if top_tag:
        return f"오늘은 {top_tag} 관련 지출 비중이 높았어요. 한 번은 대중교통 등 대체 옵션을 시도해보는 건 어떨까요?"
    return "오늘 지출이 소액으로 분산되었습니다. 불필요한 이동/간식 한 번만 줄여보는 걸 추천드립니다."


def generate_weekly_comment(summary: Dict) -> str:
    """주간 코멘트 생성 (전주 대비 변화/태그 포인트 기반)"""
    deltas = summary.get("deltas", {})
    top_up = None
    if deltas:
        # 증가폭 상위 카테고리 찾기
        top_up = max(deltas.items(), key=lambda x: x[1])[0]

    if OPENAI_API_KEY:
        try:
            from openai import OpenAI  # type: ignore

            client = OpenAI(api_key=OPENAI_API_KEY)
            prompt = (
                "주어진 주간 요약으로 3문장 + 제안 1문장 주간 코멘트를 만들어주세요. 한국어, 존댓말. 비난 금지.\n"
                f"요약: {summary}"
            )
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Coach persona. Polite. No blame."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            msg = resp.choices[0].message.content or ""
            if msg:
                return msg.strip()
        except Exception:
            pass

    if top_up:
        return f"이번 주는 '{top_up}' 지출이 늘었습니다. 평일 루틴을 약간 앞당기거나 대체 수단을 시도해 비용을 낮춰보세요."
    return "이번 주 기록이 적었습니다. 이번 주 한 건부터 가볍게 입력해보시고, 소액 지출부터 점검해보는 걸 추천드립니다."


def generate_monthly_profile(aggregate: Dict) -> Dict:
    """월간 소비자 타입 판단
    - 간단히 상위 카테고리/태그 비중을 기준으로 타입/근거/조언을 생성.
    - OpenAI 실패 시 규칙 기반 결과 반환.
    """
    totals = aggregate.get("totals", {})
    tag_breakdown = aggregate.get("tags", {})
    # 간단 로직: 태그/카테고리 비중으로 타입 결정
    top_tag = None
    if tag_breakdown:
        top_tag = max(tag_breakdown.items(), key=lambda x: x[1])[0]

    type_code = "reward"
    label = "보상형 소비자"
    if top_tag in ("시간절약", "편의"):
        type_code = "comfort"
        label = "귀찮음형 소비자"
    elif top_tag in ("투자", "학습"):
        type_code = "growth"
        label = "투자형 소비자"
    elif top_tag in ("사회", "모임"):
        type_code = "social"
        label = "사회형 소비자"

    rationale = "상위 태그 비중을 기준으로 유형을 추정했습니다."
    advice = "다음 달 한 가지 지출을 대체 옵션으로 바꿔보는 작은 실험을 제안드립니다."

    if OPENAI_API_KEY:
        try:
            from openai import OpenAI  # type: ignore

            client = OpenAI(api_key=OPENAI_API_KEY)
            prompt = (
                "아래 월간 요약을 보고 소비자 타입을 결정하세요. JSON으로 응답: {type, label, rationale, advice}.\n"
                f"요약: {aggregate}"
            )
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You output strict JSON only."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            import json

            data = json.loads(resp.choices[0].message.content or "{}")
            return {
                "type": data.get("type", type_code),
                "label": data.get("label", label),
                "rationale": data.get("rationale", rationale),
                "advice": data.get("advice", advice),
            }
        except Exception:
            pass

    return {
        "type": type_code,
        "label": label,
        "rationale": rationale,
        "advice": advice,
    }

