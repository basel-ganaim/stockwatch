from fastapi import FastAPI
from pydantic import BaseModel
from typing import List


app = FastAPI()

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
