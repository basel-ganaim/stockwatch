import asyncio
import random

PRICES = {
    "AAPL": 189.5,
    "MSFT": 340.1,
    "TSLA": 255.8,
    "GOOG": 134.4,
    "AMZN": 175.6,
    "GOLD": 190.2,
    "SILVER": 24.3,
    "OIL": 70.5,
    "BTC": 111000.0,
    "ETH": 2000.0,

}

async def update_prices_loop():

    while True:
        for t in PRICES:
            price = PRICES[t]
            pct_move = random.gauss(0.0, 0.1) / 100.0
            new_price = price * (1.0 + pct_move)

            if new_price < 1.0:
                new_price = 1.0
            PRICES[t] = round(new_price, 2)
        await asyncio.sleep(1)
            