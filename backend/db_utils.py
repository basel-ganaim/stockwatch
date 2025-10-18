import sqlite3
from datetime import datetime

DB_PATH = "stockwatch.db"

# inserting a ticker into the watchlist

def add_ticker(ticker: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO watchlist (ticker, created_at) VALUES (?, ?)",
        (ticker.upper(), datetime.utcnow().isoformat())
    )

    conn.commit()
    conn.close

    # fetching all tickers from the watchlist   
def get_watchlist():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("SELECT ticker, created_at FROM watchlist ORDER BY created_at DESC")
    rows = cur.fetchall()

    conn.close()
    return rows

def remove_ticker(ticker: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute( "DELETE FROM watchlist WHERE ticker = ?", (ticker.upper(),))
    conn.commit()
    conn.close()
