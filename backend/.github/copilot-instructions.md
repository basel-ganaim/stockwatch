## StockWatch — Copilot Instructions

This file gives targeted, actionable guidance for an AI coding agent to be immediately productive in this backend Python project.

- Project type: FastAPI backend (single-process), lightweight SQLite persistence.
- Entry point: `main.py` — starts FastAPI app and launches two background tasks on startup: `update_prices_loop()` (from `prices.py`) and `evaluate_rules_loop()` (from `rules.py`).

Key concepts and files
- `prices.py`: holds global dictionaries `PRICES` and `INTRADAY`, and the `TICKERS` list. `update_prices_loop()` uses `yfinance` to refresh prices (every ~5s) and writes into those globals.
- `rules.py`: defines `/rules` and `/events` routers. Rules are persisted via `db_utils.add_rule` and evaluated periodically in `evaluate_rules_loop()` (every ~2s). Triggered events are written to the `events` table via `db_utils.add_event`.
- `db_simple.py`: creates the SQLite DB (`stockwatch.db`) and tables via `init_db()` called from `main.py` at import time.
- `db_utils.py`: low-level DB operations used across the code (watchlist CRUD, rules, events). Note: functions sometimes use `sqlite3.connect(DB_PATH)` directly and sometimes use `_conn()` / `get_conn()` which set `row_factory`.
- `main.py`: mounts routers from `rules.py`, exposes watchlist endpoints (`/watchlist`), price endpoints (`/prices`, `/price/{ticker}`), and configures CORS to allow `localhost:5173` (frontend is expected to run on that port).

Behavioral / style patterns (discoverable)
- Tickers are stored and compared uppercase (code uppercases inputs before DB writes or lookups).
- Prices are rounded to 6 decimal places before stored in `PRICES` and `INTRADAY`.
- DB rows returned by some helpers are `sqlite3.Row` (dict-like) and by others are plain tuples — when consuming, code frequently converts rows to dicts (`[dict(r) for r in rows]`) in `db_utils`.
- Background loops are simple asyncio tasks created with `asyncio.create_task(...)` in FastAPI startup event — expect global state mutation (no external queue/message bus).

Developer workflows (how to run & debug)
- Install dependencies (typical):
  pip install fastapi uvicorn yfinance pydantic

- Run the server locally (development):
  uvicorn main:app --reload --port 8000

- Database: `init_db()` runs on import (called in `main.py`). DB file `stockwatch.db` lives next to the code. To reset, stop server and delete `stockwatch.db`.

- Logs and quick debugging:
  - Price fetch prints from `prices.py` ("Updated prices: ...").
  - Rule triggers print from `rules.py` when events are added.
  - Use HTTP requests to exercise endpoints: `/prices`, `/price/{TICKER}`, `/watchlist`, `/rules`, `/events`.

Examples (use as templates)
- Create a rule (POST /rules):
  { "ticker": "AAPL", "direction": "above", "price": 200.0 }
- Add watchlist ticker (POST /watchlist):
  { "ticker": "TSLA" }

Integration notes & gotchas
- External dependency: `yfinance` (live network calls). Price updates run frequently; consider reducing frequency while developing.
- Global in-memory state: `PRICES`, `INTRADAY`, and `last_states` in `rules.py` drive behavior. Tests or agents modifying those should be aware of concurrency/background loops.
- SQLite usage: code uses the same DB file from multiple async tasks but the project currently runs single-process; ensure you close connections after writes (current helpers call `close()`).

If you change DB schema, update `init_db()` in `db_simple.py` and consider a migration/reset strategy for `stockwatch.db`.

What I expect from AI edits
- Keep changes minimal and local: prefer adding helpers or small bug fixes over large refactors.
- Preserve the global-state model unless you implement and wire a safe replacement (e.g., background queue) and update `main.py` startup wiring.

Questions for the repo owner
- Is there a preferred list of Python package versions or a `requirements.txt` you want me to add?
- Should price-update frequency be reduced for local dev (currently 5s) or left as-is?

End of file.
