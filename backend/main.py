"""
FastAPI 엔트리포인트

실행:
- 로컬(권장): 프로젝트 루트에서 `uvicorn backend.main:app --reload`
  (패키지 임포트 안정성을 위해 모듈 경로를 명시합니다)
환경 변수:
- MONGO_URI, MONGO_DB
- OPENAI_API_KEY

배포(Render):
- Start Command: uvicorn backend.main:app --host 0.0.0.0 --port 10000
- 환경변수: 위와 동일
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import connect_to_mongo, close_mongo_connection
from routers.spendings import router as spendings_router
from routers.reports import router as reports_router
from routers.users import router as users_router
from routers.auth import router as auth_router
from routers.auth_google import router as auth_google_router
from routers.stocks import router as stocks_router
from routers.insights import router as insights_router

app = FastAPI(title="spendWallet API", version="0.1.0")

# CORS 설정 (정확한 Origin 지정)
origins = [
    "http://localhost:5173",              # 로컬 개발용
    "https://spendwallet.vercel.app",     # Vercel 배포 주소
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # 서버 시작 시 MongoDB 연결
    await connect_to_mongo()
    # 필수 인덱스 준비 (이메일 unique)
    from database import collections

    cols = collections()
    try:
        await cols["users"].create_index("email", unique=True)
        await cols["spendings"].create_index([("user_id", 1), ("spent_at", 1)], unique=False)
        await cols["weekly_reports"].create_index([("user_id", 1), ("week_start", 1), ("week_end", 1)], unique=True)
        await cols["monthly_profiles"].create_index([("user_id", 1), ("month", 1)], unique=True)
    except Exception:
        # 인덱스 에러는 서비스 구동에 치명적이지 않으므로 로깅만
        pass


@app.on_event("shutdown")
async def on_shutdown():
    # 서버 종료 시 연결 닫기
    await close_mongo_connection()


# 라우터 등록
app.include_router(users_router)
app.include_router(spendings_router)
app.include_router(reports_router)
app.include_router(auth_router)
app.include_router(auth_google_router)
app.include_router(stocks_router)
app.include_router(insights_router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "spendWallet"}
