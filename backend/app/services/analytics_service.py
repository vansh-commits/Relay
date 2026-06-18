from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings


async def get_query_volume(db: AsyncSession, period_days: int, granularity: str) -> list[dict]:
    trunc = "hour" if granularity == "hour" else "day"
    result = await db.execute(
        text("""
            SELECT
                date_trunc(:trunc, created_at) AS bucket,
                COUNT(*) AS count
            FROM messages
            WHERE role = 'user'
              AND created_at >= NOW() - make_interval(days => :period_days)
            GROUP BY bucket
            ORDER BY bucket
        """),
        {"trunc": trunc, "period_days": period_days},
    )
    return [{"timestamp": row.bucket.isoformat(), "count": row.count} for row in result]


async def get_resolution_rate(db: AsyncSession, period_days: int) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT
                DATE(created_at) AS date,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
            FROM conversations
            WHERE created_at >= NOW() - make_interval(days => :period_days)
            GROUP BY DATE(created_at)
            ORDER BY date
        """),
        {"period_days": period_days},
    )
    rows = []
    for row in result:
        rate = round(row.resolved / row.total * 100, 2) if row.total else 0.0
        rows.append({"date": str(row.date), "total": row.total, "resolved": row.resolved, "rate": rate})
    return rows


async def get_top_questions(db: AsyncSession, period_days: int, limit: int) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT
                m.content,
                m.confidence_score
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE m.role = 'user'
              AND (m.confidence_score < :threshold OR c.status = 'escalated')
              AND m.created_at >= NOW() - make_interval(days => :period_days)
            ORDER BY m.created_at DESC
            LIMIT :limit
        """),
        {"threshold": settings.CONFIDENCE_THRESHOLD, "period_days": period_days, "limit": limit},
    )
    return [{"content": row.content, "confidence_score": row.confidence_score} for row in result]


async def get_escalation_frequency(db: AsyncSession, period_days: int) -> list[dict]:
    result = await db.execute(
        text("""
            SELECT
                reason,
                COUNT(*) AS count,
                AVG(confidence_score) AS avg_confidence
            FROM escalations
            WHERE created_at >= NOW() - make_interval(days => :period_days)
            GROUP BY reason
            ORDER BY count DESC
        """),
        {"period_days": period_days},
    )
    return [
        {
            "reason": row.reason,
            "count": row.count,
            "avg_confidence": round(row.avg_confidence or 0, 3),
        }
        for row in result
    ]


async def get_summary_stats(db: AsyncSession, period_days: int) -> dict:
    result = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE role = 'user') AS total_queries,
                COUNT(*) FILTER (WHERE role = 'assistant') AS total_responses,
                AVG(confidence_score) FILTER (WHERE role = 'assistant' AND confidence_score IS NOT NULL) AS avg_confidence,
                COUNT(*) FILTER (WHERE role = 'assistant' AND confidence_score < :threshold) AS low_confidence_count
            FROM messages
            WHERE created_at >= NOW() - make_interval(days => :period_days)
        """),
        {"threshold": settings.CONFIDENCE_THRESHOLD, "period_days": period_days},
    )
    row = result.one()

    # Get pending escalations count
    esc_result = await db.execute(text("SELECT COUNT(*) FROM escalations WHERE status = 'pending'"))
    pending_escalations = esc_result.scalar() or 0

    # Get resolution rate
    conv_result = await db.execute(
        text("""
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
            FROM conversations
            WHERE created_at >= NOW() - make_interval(days => :period_days)
        """),
        {"period_days": period_days},
    )
    conv_row = conv_result.one()
    resolution_rate = round(conv_row.resolved / conv_row.total * 100, 1) if conv_row.total else 0.0

    return {
        "total_queries": row.total_queries or 0,
        "total_responses": row.total_responses or 0,
        "avg_confidence": round(row.avg_confidence or 0, 3),
        "low_confidence_count": row.low_confidence_count or 0,
        "pending_escalations": pending_escalations,
        "resolution_rate": resolution_rate,
    }
