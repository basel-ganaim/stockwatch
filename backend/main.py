from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import asyncio
from prices import PRICES, INTRADAY, update_prices_loop
from rules import router as rules_router, events_router, evaluate_rules_loop
from fastapi.middleware.cors import CORSMiddleware
from db_utils import add_ticker, get_watchlist as db_get_watchlist, remove_ticker
from db_utils import DB_PATH
from db_simple import init_db 


init_db()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],   # allow GET/POST/DELETE etc.
    allow_headers=["*"],   # allow JSON headers
)
    
app.include_router(rules_router)
app.include_router(events_router)

# the supported tickers for now

@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(update_prices_loop())
    asyncio.create_task(evaluate_rules_loop())

@app.get("/")
def health():
    return{"ok": True}


class AddTicker(BaseModel):
    ticker: str


@app.get("/watchlist")
def get_watchlist():
    rows = db_get_watchlist()
    return [t for (t, _created_at) in rows]


@app.post("/watchlist")
def add_watchlist_endpoint(item: AddTicker):
    add_ticker(item.ticker) # write to the db
    rows = db_get_watchlist()
    return [t for (t, _created_at) in rows]

@app.delete("/watchlist/{ticker}")
def remove_watchlist(ticker: str):
    remove_ticker(ticker)
    rows = db_get_watchlist()
    return [t for (t, _created_at) in rows]

@app.get("/prices")
def get_prices():
    return PRICES


@app.get("/price/{ticker}")
def get_price(ticker: str):
    t = ticker.upper()
    price = PRICES.get(t)
    if price is None:
        return {"ok": False, "error": f"No price available for '{t}' yet. Add it to your watchlist and wait for the next refresh."}
    return {"ok": True, "ticker": t, "price": price}



@app.get("/intraday")
def get_intraday_all():
    return INTRADAY


@app.get("/intraday/{ticker}")
def get_intraday_single(ticker: str):
    t = ticker.upper()
    series = INTRADAY.get(t)
    if not series:
        return {"ok": False, "error": f"No intraday data for '{t}'."}
    return {"ok": True, "ticker": t, "data": series}

