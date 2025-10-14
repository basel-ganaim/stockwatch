from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import asyncio
from prices import PRICES, update_prices_loop
from rules import router as rules_router, events_router, evaluate_rules_loop
from fastapi.middleware.cors import CORSMiddleware
from prices import PRICES


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

@app.on_event("startup")
async def start_background_tasks():
    asyncio.create_task(update_prices_loop())
    asyncio.create_task(evaluate_rules_loop())

@app.get("/")
def health():
    return{"ok": True}

#tmp in-memory watchlist
WATCHLIST: set[str] = set()

# the supported tickers for now
SUPPORTED_TICKERS = {"AAPL", "MSFT", "TSLA", "GOOG", "AMZN"}


class AddTicker(BaseModel):
    ticker: str


@app.get("/watchlist")
def get_watchlist() -> List[str]:
    return sorted(WATCHLIST)


@app.post("/watchlist")
def add_watchlist(item: AddTicker):
    t = item.ticker.upper()
    if t not in SUPPORTED_TICKERS:
        return {"ok": False, "error": f"Unsupported ticker '{t}'. Try one of {sorted(SUPPORTED_TICKERS)}"}
    WATCHLIST.add(t)
    return {"ok": True, "tickers": sorted(WATCHLIST)}

@app.delete("/watchlist/{ticker}")
def remove_watchlist(ticker: str):
    t = ticker.upper()
    if t in WATCHLIST:
        WATCHLIST.remove(t)
        return {"ok": True, "tickers": sorted(WATCHLIST)}
    return {"ok": False, "error": f"Ticker '{t}' not in watchlist"}

@app.get("/prices")
def get_prices():
    return PRICES


@app.get("/price/{ticker}")
def get_price(ticker: str):
    t = ticker.upper()
    if t not in SUPPORTED_TICKERS:
        return {"ok": False, "error": f"Unsupported ticker '{t}', try one of {sorted(SUPPORTED_TICKERS)}"}
    price = PRICES.get(t)
    return {"ok": True, "ticker": t, "price": price}
