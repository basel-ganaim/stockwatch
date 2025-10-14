import asyncio
from datetime import datetime
from typing import Literal, List
from fastapi import APIRouter
from pydantic import BaseModel

from prices import PRICES

class RuleCreate(BaseModel):
    ticker: str
    direction: Literal["above", "below"]
    price: float

class Rule(BaseModel):
    id: int
    ticker: str
    direction: Literal["above", "below"]
    price: float
    created_at: datetime

class Event(BaseModel):
    rule_id: int
    ticker: str
    price: float
    direction: Literal["above", "below"]
    triggered_at: datetime



RULES: List[Rule] = []
EVENTS: List[Event] = []
_next_rule_id = 1

router = APIRouter(prefix = "/rules", tags = ["rules"])
events_router = APIRouter(prefix = "/events", tags = ["events"])


@router.post("")
def create_rule(payload: RuleCreate):
    global _next_rule_id
    t = payload.ticker.upper()
    if t not in PRICES:
                return {"ok": False, "error": f"Unsupported ticker '{t}'. Try one of {sorted(PRICES.keys())}"}
    rule = Rule(
            id = _next_rule_id,
            ticker = t,
            direction = payload.direction,
            price = payload.price,
            created_at = datetime.utcnow()
    )
    _next_rule_id += 1
    RULES.append(rule)
    return {"ok": True, "rule": rule.model_dump()}


@router.get("")
def list_rules() -> List[dict]:
    return [r.model_dump() for r in RULES]

@router.delete("/{rule_id}")
def delete_rule(rule_id: int):
    idx = next((i for i, r in enumerate(RULES) if r.id == rule_id), None)
    if idx is None:
        return {"ok": False, "rules": [r.model_dump() for r in RULES]}
    RULES.pop(idx)
    return {"ok": True, "rules": [r.model_dump() for r in RULES]}

@events_router.get("")
def list_events():
    return [e.model_dump() for e in reversed(EVENTS)]


async def evaluate_rules_loop():
    while True:
        now = datetime.utcnow()
        for r in RULES:
            price = PRICES.get(r.ticker)
            if price is None:
                continue
            triggered = (
                (r.direction == "above" and price >= r.price) or
                (r.direction == "below" and price <= r.price)
            )
            if triggered:
                EVENTS.append(Event(
                    rule_id = r.id,
                    ticker = r.ticker,
                    price = price,
                    direction = r.direction,
                    triggered_at = now
                ))
        await asyncio.sleep(2)
            

