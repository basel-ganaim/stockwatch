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
        rules = db_list_rules()
        seen_ids = set()
        now = datetime.utcnow()

        for r in rules:
            rid = r["id"]
            ticker = r["ticker"]
            direction = r["direction"]
            target_price = r["price"]
            seen_ids.add(rid)

            price = PRICES.get(ticker)
            if price is None:
                continue

            condition_met = ( #returns True or False
                price >= target_price if direction == "above"
                else price <= target_price
            )
            prev_condition = last_states.get(rid)

            triggered = False
            if prev_condition is None: 
                triggered = condition_met
            elif not prev_condition and condition_met:
                triggered = True
            last_states[rid] = condition_met

            if triggered:
                db_add_event(rid, ticker, price, direction)
                print(
                    f"Rule {rid} trigered: {ticker} {direction} {target_price} "
                    f"at {now.isoformat()} (price = {price})"
                )
        for rid in list(last_states.keys()):
            if rid not in seen_ids:
                last_states.pop(rid, None)
        await asyncio.sleep(2)

            

            
