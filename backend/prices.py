import asyncio
import yfinance as yf
from db_utils import get_watchlist 
PRICES = {}
INTRADAY = {}
DEFAULT_TICKERS = [
    "AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "TSLA", "META", "AMD",
    "NFLX", "PLTR", "SMCI", "NKE", "ORCL", "INTC", "SPY", "QQQ", "DIA",
    "BTC-USD", "ETH-USD", "SOL-USD", "ADA-USD", "XRP-USD", "DOGE-USD",
    "GLD", "SLV", "PPLT", "PALL", "HG=F"
]

WL_TICKERS = [row[0] for row in get_watchlist()]

TRACKED_TICKERS = set(DEFAULT_TICKERS + WL_TICKERS)

def watchlist_tickers():
    return [row[0].upper() for row in get_watchlist()]

async def update_prices_loop():
    while True:
        tracked = set(DEFAULT_TICKERS) | set(watchlist_tickers())
        for t in tracked:
            try:
                ticker = yf.Ticker(t)
                history = ticker.history(period="1d", interval="1m")
                closes = history["Close"].dropna()
                if closes.empty:
                    continue

                latest_price = closes.iloc[-1]
                PRICES[t] = round(float(latest_price), 6)
                INTRADAY[t] = [
                    {"time": index.isoformat(), "price": round(float(price), 6)}
                    for index, price in closes.items()
                ]
            except Exception as e:
                print(f"Error fetching price for {t}: {e}")
        print("Updated prices:", PRICES)
        await asyncio.sleep(5)  # update every 5 seconds
