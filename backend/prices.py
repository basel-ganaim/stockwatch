import asyncio
import yfinance as yf

PRICES = {}
INTRADAY = {}
TICKERS = [
    "AAPL", "MSFT", "GOOG", "AMZN", "NVDA",
    "TSLA", "AMD", "NFLX", "PLTR", "SMCI",
    "BTC-USD", "ETH-USD", "SPY", "QQQ", "GLD",
    "NKE"
]


async def update_prices_loop():
    while True:
        for t in TICKERS:
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
