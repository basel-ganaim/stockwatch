import asyncio
import yfinance as yf

PRICES = {}
TICKERS = ["AAPL", "MSFT", "TSLA", "GOOG", "AMZN"]


async def update_prices_loop():
    while True:
        for t in TICKERS:
            try:
                data = yf.Ticker(t)
                price = data.history(period = "1d", interval = "1m")["Close"].iloc[-1]
                PRICES[t] = round(float(price), 2)
            except Exception as e:
                print(f"Error fetching price for {t}: {e}")
        print("Updated prices:", PRICES)
        await asyncio.sleep(10)  # update every 10 seconds
                                                                     