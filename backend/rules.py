import asyncio
from datetime import datetime
from typing import Literal, List
from fastapi import APIRouter
from pydantic import BaseModel
from db_utils import add_rule as db_add_rule
from db_utils import delete_rule as db_delete_rule
from db_utils import list_events as db_list_events
from db_utils import add_event as db_add_event
from db_utils import list_rules as db_list_rules

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
    t = payload.ticker.upper()
    if t not in PRICES:
        return {"ok": False, "error": f"Unsupported ticker '{t}'. Try one of {sorted(PRICES.keys())}"}

    # write to SQLite instead of in-memory
    rid = db_add_rule(t, payload.direction, payload.price)
    return {"ok": True, "id": rid}


@router.get("")
def list_rules() -> List[dict]:
    return db_list_rules()


@router.delete("/{rule_id}")
def delete_rule(rule_id: int):
    db_delete_rule(rule_id)        
    return db_list_rules()   



@events_router.get("")
def list_events():
    return db_list_events()

last_states = {}
async def evaluate_rules_loop():
    while True:
        now = datetime.utcnow()
        for r in RULES:
            price = PRICES.get(r.ticker)
            if price is None:
                continue

            # Determine if condition is true now
            is_above = price >= r.price
            prev_state = last_states.get(r.id)

            triggered = False
            if r.direction == "above" and prev_state == False and is_above:
                triggered = True
            elif r.direction == "below" and prev_state == True and not is_above:
                triggered = True

            # Save new state
            last_states[r.id] = is_above

            if triggered:
                EVENTS.append(Event(
                    rule_id=r.id,
                    ticker=r.ticker,
                    price=price,
                    direction=r.direction,
                    triggered_at=now
                ))
                print(f"Rule {r.id} triggered: {r.ticker} {r.direction} {r.price}")

        await asyncio.sleep(2)
            

