import sqlite3
from  pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).with_name("stockwatch.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row            # returns dict-like rows
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()



    cur.execute(""" 
            CREATE TABLE IF NOT EXISTS watchlist (
                ticker TEXT PRIMARY KEY,
                created_at TEXT NOT NULL
    )
    """)



    cur.execute("""
        CREATE TABLE IF NOT EXISTS rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            direction TEXT NOT NULL,
            price REAL NOT NULL,
            created_at TEXT NOT NULL
            )""")




    cur.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_id INTEGER NOT NULL,
            ticker TEXT NOT NULL,
            direction TEXT NOT NULL,
            price REAL NOT NULL,
            triggered_at TEXT NOT NULL
            )""")
    conn.commit()
    conn.close()