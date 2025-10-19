import asyncio
import yfinance as yf

PRICES = {}
TICKERS = [
    "AAPL", "MSFT", "GOOG", "AMZN", "NVDA",
    "TSLA", "AMD", "NFLX", "PLTR", "SMCI",
    "BTC-USD", "ETH-USD", "SPY", "QQQ", "GLD"
]

async def update_prices_loop():
    while True:
        for t in TICKERS:
            try:
                data = yf.Ticker(t)
                price = data.history(period = "1d", interval = "1m")["Close"].iloc[-1]
                PRICES[t] = round(float(price), 6)
            except Exception as e:
                print(f"Error fetching price for {t}: {e}")
        print("Updated prices:", PRICES)
        await asyncio.sleep(5)  # update every 1 seconds
                                                                     