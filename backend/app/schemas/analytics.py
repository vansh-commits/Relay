from pydantic import BaseModel


class SummaryStats(BaseModel):
    total_queries: int
    total_responses: int
    avg_confidence: float
    low_confidence_count: int
    pending_escalations: int
    resolution_rate: float
