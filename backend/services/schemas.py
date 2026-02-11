from pydantic import BaseModel, Field
from typing import List, Optional

class OptimizeRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=2)
    min_weight: float = Field(0.0, ge=0.0, le=100.0)
    max_weight: float = Field(100.0, ge=0.0, le=100.0)
    target_mode: str = Field("volatility") # Could add more strict validation later
    target_value: float = Field(0.0, ge=0.0)
    target_volatility: float = Field(0.0, ge=0.0)
