"""SendGrid 메일 발송 유틸리티

환경 변수
- SENDGRID_API_KEY: SendGrid API 키
- SENDER_EMAIL: 발신자 이메일 주소 (SendGrid에 인증된 주소)

스케줄러(`backend/scheduler/send_daily_reminders.py`)에서 import해서 사용한다.
"""
from __future__ import annotations

import os
import requests


SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")


def send_reminder_email(to_email: str, name: str) -> None:
    """SendGrid로 하루 소비 기록 알림 메일 전송 (HTML 템플릿)

    본문 멘트는 다음 내용을 기반으로 한다:

    안녕하세요, {name}님 👋

    오늘 하루 소비를 아직 기록하지 않으셨다면
    지금 SpendWallet에서 하루를 마무리해보세요!

    작은 기록이 모여 더 똑똑한 소비로 이어집니다 💪
    (이 메일은 매일 저녁 9시에 자동 발송됩니다)
    """

    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        print("[메일 전송 건너뜀] SENDGRID_API_KEY 또는 SENDER_EMAIL 미설정")
        return

    safe_name = name or "사용자"

    # HTML 템플릿 (Gmail/SendGrid 친화적인 간단한 브랜드 메일)
    html_template = """<!DOCTYPE html>
<html lang=\"ko\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>SpendWallet 리마인더</title>
  <style>
    body {
      font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
      background-color: #f7f9fb;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 520px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background-color: #3b82f6;
      color: #fff;
      text-align: center;
      padding: 18px 10px;
      font-size: 22px;
      font-weight: 600;
    }
    .content {
      padding: 24px;
      line-height: 1.7;
      font-size: 15px;
    }
    .cta-btn {
      display: inline-block;
      margin: 25px 0 15px 0;
      background-color: #3b82f6;
      color: #fff;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .cta-btn:hover {
      background-color: #2563eb;
    }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 13px;
      color: #999;
      border-top: 1px solid #eee;
      background-color: #fafafa;
    }
  </style>
</head>
<body>
  <div class=\"container\">
    <div class=\"header\">SpendWallet 💸</div>
    <div class=\"content\">
      <p>안녕하세요, <strong>{name}</strong>님 👋</p>
      <p>
        오늘 하루 소비를 아직 기록하지 않으셨다면<br/>
        지금 SpendWallet에서 하루를 마무리해보세요!
      </p>
      <p>
        작은 기록이 모여 더 똑똑한 소비로 이어집니다 💪<br/>
        <span style=\"font-size:13px; color:#777;\">(이 메일은 매일 저녁 9시에 자동 발송됩니다)</span>
      </p>
      <a href=\"https://spendwallet.vercel.app\" class=\"cta-btn\">대시보드 바로가기</a>
    </div>
    <div class=\"footer\">
      이 메일은 SpendWallet의 알림 서비스입니다.<br/>
      수신을 원하지 않으시면 이 메일에 회신하여 알려주세요.
    </div>
  </div>
</body>
</html>
"""

    html_content = html_template.replace("{name}", safe_name)

    data = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": SENDER_EMAIL, "name": "SpendWallet"},
        "subject": "💸 SpendWallet - 오늘 소비 기록, 1분이면 끝나요!",
        "content": [{"type": "text/html", "value": html_content}],
    }

    try:
        res = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json=data,
            timeout=10,
        )
    except Exception as e:  # pragma: no cover - 네트워크 환경 의존
        print(f"[메일 전송 실패] {to_email}: {e}")
        return

    if res.status_code not in (200, 202):
        print(f"[메일 전송 실패] {to_email}: {res.status_code} {res.text}")
    else:
        print(f"[메일 전송 성공] {to_email}")

