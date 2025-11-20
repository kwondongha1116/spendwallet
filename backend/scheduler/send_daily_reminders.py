"""매일 저녁 9시에 소비 기록 알림 메일을 보내는 스크립트

Render Cron Job에서 다음과 같이 실행하도록 설정하면 된다.

Command 예시:
- python -m backend.scheduler.send_daily_reminders

스케줄:
- 0 21 * * * (Asia/Seoul 기준 매일 21시)
"""
from __future__ import annotations

import asyncio
from datetime import datetime

from database import connect_to_mongo, close_mongo_connection, collections
from utils.mailer import send_reminder_email


async def send_daily_reminders() -> None:
  """모든 사용자에게 소비 작성 리마인더 메일 발송"""
  await connect_to_mongo()
  cols = collections()
  users_col = cols["users"]

  # email, display_name 필드만 조회
  users = await users_col.find({}, {"email": 1, "display_name": 1}).to_list(None)

  count = 0
  for user in users:
    email = user.get("email")
    name = user.get("display_name") or "사용자"
    if email:
      send_reminder_email(email, name)
      count += 1

  await close_mongo_connection()
  print(f"[{datetime.now()}] ✅ Daily reminder sent to {count} users")


if __name__ == "__main__":  # 로컬 테스트용
  asyncio.run(send_daily_reminders())

