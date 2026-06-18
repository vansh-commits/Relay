from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.analytics import SummaryStats
from app.services import analytics_service

router = APIRouter()

_PERIOD_MAP = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}


def _resolve_period(period: str) -> int:
    return _PERIOD_MAP.get(period, 7)


@router.get("/summary", response_model=SummaryStats)
async def summary_stats(period: str = "7d", db: AsyncSession = Depends(get_db)):
    return await analytics_service.get_summary_stats(db, _resolve_period(period))


@router.get("/query-volume")
async def query_volume(period: str = "7d", granularity: str = "day", db: AsyncSession = Depends(get_db)):
    data = await analytics_service.get_query_volume(db, _resolve_period(period), granularity)
    return {"data": data}


@router.get("/resolution-rate")
async def resolution_rate(period: str = "7d", db: AsyncSession = Depends(get_db)):
    data = await analytics_service.get_resolution_rate(db, _resolve_period(period))
    return {"data": data}


@router.get("/top-questions")
async def top_questions(period: str = "7d", limit: int = 20, db: AsyncSession = Depends(get_db)):
    questions = await analytics_service.get_top_questions(db, _resolve_period(period), limit)
    return {"questions": questions}


@router.get("/escalation-frequency")
async def escalation_frequency(period: str = "7d", db: AsyncSession = Depends(get_db)):
    data = await analytics_service.get_escalation_frequency(db, _resolve_period(period))
    return {"data": data}
