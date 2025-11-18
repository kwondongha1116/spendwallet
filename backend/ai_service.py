"""AI 분석 모듈 (GPT-4o-mini 기반)

역할
- 항목 분류: 메모/금액을 보고 카테고리·태그·신뢰도 추론
- 일간 코멘트: 하루 소비 패턴 요약 + 행동 제안
- 주간 코멘트: 카테고리 증감 기반 주간 요약
- 월간 프로필: 재미있는 소비자 유형 + 요약 + 조언

주의
- OPENAI_API_KEY 가 없거나 호출 실패 시, 간단한 규칙 기반 폴백을 사용합니다.
- 프롬프트는 한국어로 작성되어 있고, 응답은 JSON을 기대합니다.
"""
from __future__ import annotations

import json
import os
from typing import Dict, List

from openai import OpenAI


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client: OpenAI | None = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def _call_gpt(system_prompt: str, user_prompt: str, max_tokens: int = 400) -> str:
    """GPT 호출 래퍼 (에러 시 빈 문자열 반환)"""
    if client is None:
        return ""
    try:
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
            max_tokens=max_tokens,
        )
        return (res.choices[0].message.content or "").strip()
    except Exception as e:  # pragma: no cover - 환경 의존
        print(f"[AI ERROR] {e}")
        return ""


def _heuristic_category_and_tags(memo: str, amount: int) -> tuple[str, List[str], float]:
    """간단한 규칙 기반 카테고리/태그 추정 (AI 폴백용)"""
    m = memo.lower()
    category = "기타"
    tags: List[str] = []

    if any(k in m for k in ["택시", "버스", "지하철", "교통", "uber", "kakaot"]):
        category = "시간절약형"
        tags.append("교통")
    elif any(k in m for k in ["커피", "카페", "라떼", "스타벅스"]):
        category = "보상형"
        tags.append("간식")
    elif any(k in m for k in ["배달", "요기요", "배민", "배달의민족"]):
        category = "시간절약형"
        tags.append("배달")
    elif any(k in m for k in ["점심", "저녁", "식사", "한식", "분식", "라면"]):
        category = "생활필수형"
        tags.append("식비")
    elif any(k in m for k in ["책", "강의", "인강", "토익", "토플"]):
        category = "자기계발형"
        tags.append("투자")
    elif any(k in m for k in ["술", "맥주", "소주", "회식", "모임"]):
        category = "사교형"
        tags.append("모임")

    if amount >= 50000:
        tags.append("고가")

    # 중복 제거
    tags = list(dict.fromkeys(tags))
    confidence = 0.6 if category == "기타" else 0.8
    return category, tags, confidence


def analyze_item(memo: str, amount: int) -> Dict:
    """단일 소비 항목에 대한 AI 기반 분류 결과 반환

    반환 예: {"category": "시간절약형", "tags": ["교통"], "confidence": 0.83}
    """
    system_prompt = (
        "너는 소비 내역을 의미 기반으로 분류하는 한국어 데이터 분석 어시스턴트야. "
        "항상 JSON으로만 응답해야 해."
    )
    user_prompt = f"""
다음 소비 항목을 보고, 실제로 어떤 지출(무엇을 위해 쓴 돈)인지와 
그 소비의 성격(왜 썼는지)을 분석해 주세요.

항목: {memo}
금액: {amount}원

항상 JSON 형식으로 응답해야 합니다:
{{"category": "식비", "tags": ["보상형"], "confidence": 0.87}}

---

카테고리(category): 
- 실질적으로 무엇에 쓴 돈인지 설명합니다. 
- 아래 예시들은 참고용이며, 이 예시들 외에도 설명 가능합니다. 
[식비, 교통, 주거, 통신, 쇼핑, 여가, 여행, 교육, 건강, 금융, 반려동물, 문화, 기타]
- 단, “기타”는 정말 분류할 수 없을 때만 사용하세요.

태그(tags):
- 소비의 동기나 성향을 나타냅니다.
- 각 소비에 가장 적절한 동기나 성향을 정해주세요.
- 아래 예시들은 참고용이며, 이 예시들 외에도 설명 가능합니다. 
[생활필수형, 시간절약형, 생산성향상형, 건강관리형, 보상형, 충동형, 기분전환형,
 사교형, 과시형, 연애형, 자기계발형, 투자형, 창의형, 여가형, 엔터테인먼트형,
 낭비형, 루틴형, 미니멀형, 윤리형, 감성형]
- 2개까지 선택 가능. (일반적으로는 1개)

---

항상 category와 tags를 모두 포함한 JSON으로만 응답하세요.
명확한 기준이 없더라도, 가장 가능성이 높은 분류를 자신 있게 선택하세요.
"""



    content = _call_gpt(system_prompt, user_prompt, max_tokens=180)
    if content:
        try:
            data = json.loads(content)
            category = data.get("category")
            tags = data.get("tags") or []
            if not isinstance(tags, list):
                tags = []
            confidence = float(data.get("confidence", 0.8))
            if category:
                return {"category": str(category), "tags": tags, "confidence": confidence}
        except Exception:
            # JSON 파싱 실패 시 폴백
            pass

    cat, tags, conf = _heuristic_category_and_tags(memo, amount)
    return {"category": cat, "tags": tags, "confidence": conf}


def generate_daily_comment(items: List[Dict]) -> str:
    """일간 코멘트 생성"""
    if not items:
        return "오늘 기록이 없어요. 오늘 한 건부터 가볍게 적어볼까요?"

    total = sum(int(i.get("amount", 0)) for i in items)
    memos = ", ".join(i.get("memo", "") for i in items[:10])

    tag_sum: Dict[str, int] = {}
    for it in items:
        amt = int(it.get("amount", 0))
        for tag in it.get("tags", []) or []:
            tag_sum[tag] = tag_sum.get(tag, 0) + amt
    top_tag = max(tag_sum, key=tag_sum.get) if tag_sum else None

    system_prompt = (
        "너는 하루 소비를 분석해 간단한 피드백을 주는 한국어 코치야. "
        "비난하지 말고, 관찰 1개 + 행동 제안 1개를 1~2문장으로 말해줘."
    )
    user_prompt = f"""총 지출액: {total}원
주요 항목: {memos}
대표 태그: {top_tag or '없음'}

형식:
- 첫 문장은 오늘 소비의 특징을 관찰
- 두 번째 문장은 내일을 위한 구체적 제안
"""

    content = _call_gpt(system_prompt, user_prompt, max_tokens=200)
    if content:
        return content

    if top_tag:
        return f"오늘은 {top_tag} 관련 지출 비중이 높았어요. 한 번은 대중교통이나 대체 옵션을 시도해보는 건 어떨까요?"
    return "오늘 지출이 소액으로 분산되었어요. 불필요한 간식이나 이동 한 번만 줄여보는 걸 추천드립니다."


def generate_weekly_comment(summary: Dict) -> str:
    """주간 코멘트 생성

    summary 예:
    {"week": "2025-W47", "totals": {...}, "deltas": {...}}
    """
    totals: Dict[str, int] = summary.get("totals", {}) or {}
    deltas: Dict[str, float] = summary.get("deltas", {}) or {}
    week = summary.get("week", "")

    if not totals:
        return "이번 주에는 소비 기록이 거의 없어요. 작은 지출부터 한번 적어보는 건 어떨까요?"

    up_cat = None
    up_val = 0.0
    down_cat = None
    down_val = 0.0
    for k, v in deltas.items():
        if v > up_val:
            up_val, up_cat = v, k
        if v < down_val:
            down_val, down_cat = v, k

    total_this = sum(totals.values())
    top_cat = max(totals, key=totals.get)

    system_prompt = (
        "너는 사용자의 주간 소비 트렌드를 분석하고 실용적인 피드백을 주는 한국어 코치야. "
        "3문장 + 제안 1문장 구조로 작성해줘."
    )
    user_prompt = f"""주차: {week}
전체 지출 합계: {total_this}원
카테고리별 합계: {totals}
전주 대비 증감률: {deltas}
가장 많이 쓴 카테고리: {top_cat}
증가폭이 큰 카테고리: {up_cat} ({up_val*100:.1f}%)
감소폭이 큰 카테고리: {down_cat} ({down_val*100:.1f}%)

형식:
- 1문장: 지난주 대비 핵심 변화 요약
- 2문장: 눈에 띄는 카테고리/태그 포인트
- 3문장: 요일/패턴이 있을 것 같다면 언급
- 4문장: 다음 주를 위한 구체적인 행동 제안
"""

    content = _call_gpt(system_prompt, user_prompt, max_tokens=260)
    if content:
        return content

    msg = f"이번 주는 '{top_cat}' 지출 비중이 높았어요. "
    if up_cat:
        msg += f"특히 {up_cat} 지출이 지난주보다 약 {up_val*100:.1f}% 증가했습니다. "
    msg += "다음 주에는 자주 쓰는 카테고리에서 한 번만 덜 쓰는 작은 실험을 해보시면 어떨까요?"
    return msg


def generate_monthly_profile(aggregate: Dict) -> Dict:
    """월간 소비자 리포트 (재미있는 유형/요약/조언 포함)

    프롬프트는 summary/persona/advice 구조를 사용하지만,
    이 함수는 라우터에서 기대하는 필드(type/label/rationale/advice)까지
    함께 구성해서 반환한다.
    """

    totals: Dict[str, int] = aggregate.get("totals", {}) or {}
    tag_ratio: Dict[str, float] = aggregate.get("tags", {}) or {}
    month = aggregate.get("month", "")

    if not totals and not tag_ratio:
        summary = "이번 달에는 소비 기록이 거의 없었어요. 절약왕 등극 👑"
        persona = "절약형 소비자"
        advice = "지금처럼 잘 아껴쓰되, 자신에게 선물 하나쯤은 괜찮아요 🎁"
        return {
            "type": persona,
            "label": persona,
            "rationale": summary,
            "advice": advice,
            "summary": summary,
            "persona": persona,
        }

    total_amt = sum(totals.values())
    detail = "\n".join([f"- {k}: {v}원" for k, v in totals.items()])

    system_prompt = (
        "너는 사용자의 한 달 소비 데이터를 분석해, MBTI 테스트처럼 재밌는 소비자 리포트를 만들어주는 한국어 어시스턴트야. "
        "문체는 캐주얼하고, 유머러스하게, 읽는 사람이 기분 좋아지게 써야 해. "
        "항상 JSON 형식으로만 응답해야 하고, 내용에는 이모지를 자유롭게 넣어도 돼."
    )

    user_prompt = f"""아래는 사용자의 한 달 소비 요약 데이터입니다.

총 지출액: {total_amt}원
항목별 비중:
{detail}

이 정보를 바탕으로 아래 세 가지를 작성해 주세요.

1️⃣ **전반적인 소비 성향 요약 (한 문장)**
   - 친구처럼 말하되, 재치 있게 써 주세요.
   - 예시: "이번 달엔 감정적으로 소비한 날이 많았어요 😅" / "계획적인 소비가 돋보였어요 🔥"

2️⃣ **소비자 유형 이름**
   - 무조건 “~형 소비자” 형태로 표현해 주세요.
   - 예시:
     - 귀찮음형 소비자 (“귀찮아서 시켜먹는 당신, 효율의 왕 👑”)
     - 감정폭발형 소비자 (“기분 따라 카드 긁는 감성 만렙 타입 🎭”)
     - 자기합리화형 소비자 (“‘오늘만 산다’의 대명사, 지갑의 철학자 🧠💸”)
     - 절약요정형 소비자 (“커피 대신 물, 택시 대신 버스 — 절제의 화신 ✨”)
     - 효율성추구형 소비자 (“시간은 돈이다. 투자형 인간 ⏱️”)
     - 인간관계형 소비자 (“사람이 재산이다 🤝”)
     - 성장지향형 소비자 (“오늘의 지출은 내일의 성장 💪”)
     - 보상형 소비자 (“스트레스 해소엔 소비가 답이지 🍰”)
     - 탐험가형 소비자 (“새로운 카페와 맛집 탐방은 멈출 수 없지 ☕🍜”)
     - 미니멀형 소비자 (“적게 사고 오래 쓰는 가치소비 장인 🧘‍♀️”)

3️⃣ **다음 달을 위한 짧은 조언 (1~2문장)**
   - 유머러스하게, 따뜻한 말투로 써 주세요.
   - 예시:
     - “다음 달엔 지갑 대신 마음의 여유를 채워보세요 😌”
     - “소비 로그 찍기 전에, 잠깐! 정말 필요한 걸까? 🤔”
     - “이제 슬슬 소비보다 적금을 아껴줄 때 💸💔”

반드시 아래 JSON 형식으로만 응답해 주세요.

{{
  "summary": "이번 달엔 감정 따라 소비한 날이 많았어요 🫣",
  "persona": "감정폭발형 소비자 (“기분 따라 카드 긁는 감성 만렙 타입 🎭”)",
  "advice": "다음 달엔 카드 대신 산책으로 리프레시해보세요 🌿"
}}
"""

    content = _call_gpt(system_prompt, user_prompt, max_tokens=400)
    if content:
        try:
            data = json.loads(content)
            summary = data.get("summary") or "이번 달엔 다양한 소비 패턴이 섞여 있었어요 🎨"
            persona = data.get("persona") or "혼합형 소비자"
            advice = data.get("advice") or "다음 달엔 ‘지출보다 휴식’을 목표로 해보세요 ☕"
            return {
                "type": persona,
                "label": persona,
                "rationale": summary,
                "advice": advice,
                "summary": summary,
                "persona": persona,
            }
        except Exception:
            # JSON 파싱 실패 시 폴백
            pass

    summary = "이번 달엔 편의 중심의 소비가 많았어요 😌"
    persona = "귀찮음형 소비자"
    advice = "다음 달엔 귀찮음을 조금만 이겨내면, 지갑이 행복해질 거예요 💸"
    return {
        "type": persona,
        "label": persona,
        "rationale": summary,
        "advice": advice,
        "summary": summary,
        "persona": persona,
    }

