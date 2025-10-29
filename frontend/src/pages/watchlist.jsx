import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PriceChart, { formatPrice } from '../components/PriceChart.jsx';

const API_BASE = 'http://127.0.0.1:8000';

const normalizeHistory = (rawHistory) => {
  const next = {};
  Object.entries(rawHistory || {}).forEach(([ticker, series]) => {
    if (!Array.isArray(series)) return;
    const upper = ticker.toUpperCase();
    next[upper] = series
      .map(({ time, price }) => {
        const parsedTime = new Date(time);
        const numericPrice = typeof price === 'number' ? price : Number(price);
        return {
          time: Number.isNaN(parsedTime.valueOf()) ? time : parsedTime,
          price: Number.isNaN(numericPrice) ? null : numericPrice,
        };
      })
      .filter(
        (point) =>
          point.time &&
          point.price !== null &&
          typeof point.price === 'number' &&
          !Number.isNaN(point.price),
      );
  });
  return next;
};

function FullscreenChart({ ticker, price, data, onClose }) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = previousOverflow;
    };
  }, []);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const overlay = (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 'min(1100px, 95vw)',
          height: '85vh',
          background: '#fff',
          borderRadius: 18,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.35)',
          padding: 32,
          gap: 24,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 28 }}>{ticker}</h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 16 }}>
              {typeof price === 'number' ? formatPrice(price) : 'Price unavailable'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1f2937',
              color: '#fff',
              borderRadius: 999,
              padding: '10px 18px',
            }}
          >
            Close
          </button>
        </header>
        <div style={{ flex: 1, minHeight: 0 }}>
          {Array.isArray(data) && data.length >= 2 ? (
            <PriceChart data={data} height={520} />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed #cbd5f5',
                borderRadius: 16,
                color: '#64748b',
              }}
            >
              Collecting intraday data…
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(overlay, document.body);
}

function WatchlistPage() {
  const [tickers, setTickers] = useState([]);
  const [prices, setPrices] = useState({});
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTicker, setNewTicker] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState(null);
  const mountedRef = useRef(false);

  const loadData = useCallback(
    async (options = {}) => {
      const { showSpinner = true } = options;
      if (showSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const [watchlistRes, pricesRes, intradayRes] = await Promise.all([
          fetch(`${API_BASE}/watchlist`),
          fetch(`${API_BASE}/prices`),
          fetch(`${API_BASE}/intraday`),
        ]);

        if (!watchlistRes.ok) {
          throw new Error(`Failed to load watchlist (status ${watchlistRes.status})`);
        }
        if (!pricesRes.ok) {
          throw new Error(`Failed to load prices (status ${pricesRes.status})`);
        }
        if (!intradayRes.ok) {
          throw new Error(`Failed to load intraday history (status ${intradayRes.status})`);
        }

        const [watchlistData, pricesData, intradayData] = await Promise.all([
          watchlistRes.json(),
          pricesRes.json(),
          intradayRes.json(),
        ]);

        if (!mountedRef.current) {
          return;
        }

        const watchlistUpper = Array.from(
          new Set((watchlistData || []).map((ticker) => String(ticker).toUpperCase())),
        );
        const normalizedHistory = normalizeHistory(intradayData);
        const filteredHistory = {};
        watchlistUpper.forEach((ticker) => {
          filteredHistory[ticker] = normalizedHistory[ticker] || [];
        });

        setTickers(watchlistUpper);
        setPrices(pricesData || {});
        setHistory(filteredHistory);
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unable to load watchlist');
        }
      } finally {
        if (showSpinner && mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    loadData();

    const interval = setInterval(() => {
      loadData({ showSpinner: false });
    }, 8000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadData]);

  const handleAddTicker = async (event) => {
    event.preventDefault();
    const trimmed = newTicker.trim().toUpperCase();
    if (!trimmed) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`Failed to add ${trimmed}`);
      }

      setNewTicker('');
      await loadData({ showSpinner: false });
      setExpandedTicker((current) => (current === trimmed ? trimmed : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add ticker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTicker = async (ticker) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/watchlist/${ticker}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(`Failed to remove ${ticker}`);
      }

      await loadData({ showSpinner: false });
      setExpandedTicker((current) => (current === ticker ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove ticker');
    } finally {
      setSubmitting(false);
    }
  };

  const rows = useMemo(() => {
    return tickers.map((ticker) => ({
      ticker,
      price: prices[ticker],
      history: history[ticker] || [],
    }));
  }, [tickers, prices, history]);

  const rowsByTicker = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      map[row.ticker] = row;
    });
    return map;
  }, [rows]);

  const activeRow = expandedTicker ? rowsByTicker[expandedTicker] : null;

  return (
    <div>
      <h1>Watchlist</h1>
      <p style={{ color: '#475569', marginBottom: 32 }}>
        Add tickers to build your personalised dashboard. We’ll stream prices and intraday movement
        for everything you follow.
      </p>

      <section style={{ display: 'grid', gap: 24 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'flex-end',
          }}
        >
          <form
            onSubmit={handleAddTicker}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#475569' }}>Ticker</span>
              <input
                type="text"
                placeholder="e.g. NVDA"
                value={newTicker}
                onChange={(event) => setNewTicker(event.target.value.toUpperCase())}
                disabled={submitting}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #cbd5f5',
                  minWidth: 160,
                  textTransform: 'uppercase',
                }}
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add to watchlist'}
            </button>
          </form>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            Need inspiration? Try AAPL, TSLA, BTC-USD, GLD…
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: '#fee2e2',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
            Loading your watchlist…
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: 32,
              borderRadius: 16,
              border: '1px dashed #cbd5f5',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            You haven’t added any tickers yet. Use the form above to start tracking symbols.
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gap: 20,
            }}
          >
            {rows.map(({ ticker, price, history: series }) => (
              <li
                key={ticker}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: 20,
                  background: '#f8fafc',
                  display: 'grid',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <strong style={{ fontSize: 20, letterSpacing: 0.5 }}>{ticker}</strong>
                    <span style={{ color: '#475569', fontSize: 15 }}>
                      {typeof price === 'number' ? formatPrice(price) : 'Price unavailable'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setExpandedTicker(ticker)}
                      style={{ background: '#0ea5e9' }}
                    >
                      Expand chart
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTicker(ticker)}
                      disabled={submitting}
                      style={{ background: '#ef4444' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div style={{ borderRadius: 12, background: '#fff', padding: 12 }}>
                  {series.length >= 2 ? (
                    <PriceChart data={series} height={180} />
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.6 }}>Collecting intraday data…</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {expandedTicker && (
        <FullscreenChart
          ticker={expandedTicker}
          price={activeRow?.price}
          data={activeRow?.history}
          onClose={() => setExpandedTicker(null)}
        />
      )}
    </div>
  );
}

export default WatchlistPage;
