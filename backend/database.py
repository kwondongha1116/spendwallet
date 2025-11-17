"""
MongoDB 연결 설정 (Motor)

환경 변수:
- MONGO_URI: MongoDB Atlas 접속 URI
- MONGO_DB: 데이터베이스 이름(기본값: spendwallet)

주의 (Windows/로컬): .env를 자동 로드하도록 구성했으니
backend/.env 에 값을 넣으면 uvicorn 실행 시 자동 적용됩니다.
"""
import os
from typing import Any, Dict

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv
from pathlib import Path
import logging

print("🔍 DEBUG MONGO_URI:", os.getenv("MONGO_URI"))

# .env 자동 로드 (backend 폴더 기준)
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

MONGO_URI = os.getenv("MONGO_URI") or "mongodb://localhost:27017"
MONGO_DB = os.getenv("MONGO_DB") or "spendwallet"


class Mongo:
    """Motor 클라이언트/DB 싱글톤 보관 클래스"""
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """애플리케이션 시작 시 MongoDB에 연결합니다."""
    # Motor 클라이언트는 비동기 드라이버이므로, 연결은 lazy하게 수행됩니다.
    # 민감 정보 마스킹된 로그
    try:
        visible = MONGO_URI.replace("mongodb+srv://", "").split("@")[1]
    except Exception:
        visible = MONGO_URI
    logging.info(f"🔍 DEBUG MONGO_URI: {visible}")
    Mongo.client = AsyncIOMotorClient(MONGO_URI)
    Mongo.db = Mongo.client[MONGO_DB]


async def close_mongo_connection() -> None:
    """애플리케이션 종료 시 MongoDB 연결을 닫습니다."""
    if Mongo.client:
        Mongo.client.close()
        Mongo.client = None
        Mongo.db = None


def get_db() -> AsyncIOMotorDatabase:
    """현재 DB 핸들을 반환 (라우터/서비스에서 호출).

    주의: FastAPI의 의존성 주입으로도 감싸 사용 가능하지만,
    여기서는 간단히 직접 참조합니다.
    """
    if Mongo.db is None:
        # 연결이 없으면 즉시 초기화 (테스트/로컬 안전장치)
        Mongo.client = AsyncIOMotorClient(MONGO_URI)
        Mongo.db = Mongo.client[MONGO_DB]
    return Mongo.db


def collections() -> Dict[str, Any]:
    """자주 쓰는 컬렉션 핸들을 반환.
    - users
    - spendings (일별 문서)
    - weekly_reports
    - monthly_profiles
    """
    db = get_db()
    return {
        "users": db.get_collection("users"),
        "spendings": db.get_collection("spendings"),
        "weekly_reports": db.get_collection("weekly_reports"),
        "monthly_profiles": db.get_collection("monthly_profiles"),
    }
