import sqlite3
from datetime import datetime
from pathlib import Path


DB_PATH = Path(__file__).with_name("stockwatch.db")

def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

# inserting a ticker into the watchlist

def add_ticker(ticker: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO watchlist (ticker, created_at) VALUES (?, ?)",
        (ticker.upper(), datetime.utcnow().isoformat())
    )

    conn.commit()
    conn.close()

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


# ---- RULES ----
def add_rule(ticker: str, direction: str, price: float) -> int:
    c = _conn(); cur = c.cursor()
    cur.execute(
        "INSERT INTO rules (ticker, direction, price, created_at) VALUES (?, ?, ?, ?)",
        (ticker.upper(), direction, float(price), datetime.utcnow().isoformat()),
    )
    c.commit(); rid = cur.lastrowid; c.close()
    return rid

def list_rules():
    c = _conn(); cur = c.cursor()
    cur.execute("SELECT id, ticker, direction, price, created_at FROM rules ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    c.close(); return rows

def delete_rule(rule_id: int) -> None:
    c = _conn(); cur = c.cursor()
    cur.execute("DELETE FROM rules WHERE id = ?", (rule_id,))
    c.commit(); c.close()

# ---- EVENTS ----

def add_event(rule_id, ticker, price, direction):
    c = _conn(); cur = c.cursor()
    cur.execute(
        "INSERT INTO events (rule_id, ticker, price, direction, triggered_at) VALUES (?, ?, ?, ?, ?)",
        (int(rule_id), ticker.upper(), float(price), direction, datetime.utcnow().isoformat()),
    )
    c.commit(); c.close()

def list_events(limit=50):
    c = _conn(); cur = c.cursor()
    cur.execute(
        "SELECT id, rule_id, ticker, price, direction, triggered_at "
        "FROM events ORDER BY id DESC LIMIT ?",
        (int(limit),),
    )
    rows = [dict(r) for r in cur.fetchall()]
    c.close(); return rows