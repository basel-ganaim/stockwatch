import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import PriceChart, { formatPrice } from './components/PriceChart.jsx';
import WatchlistPage from './pages/watchlist.jsx';
import RulesPage from './pages/rules.jsx';
import EventsPage from './pages/events.jsx';

const STOCK_CATEGORIES = {
  popular: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'SPY', 'QQQ', 'DIA', 'BTC-USD', 'ETH-USD'],
  companies: ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'ORCL', 'INTC', 'AMD', 'NKE', 'PLTR', 'SMCI'],
  crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'ADA-USD', 'XRP-USD', 'DOGE-USD'],
  metals: ['GLD', 'SLV', 'PPLT', 'PALL', 'HG=F'],
};

const CATEGORY_LABELS = {
  popular: 'Popular Picks',
  companies: 'Major Companies',
  crypto: 'Crypto',
  metals: 'Metals & Commodities',
};

function DashboardPage() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState({});
  const [activeCategory, setActiveCategory] = useState('popular');
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        setError(null);
        const [pricesRes, intradayRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/prices'),
          fetch('http://127.0.0.1:8000/intraday'),
        ]);

        if (!pricesRes.ok || !intradayRes.ok) {
          throw new Error('Failed to load pricing data');
        }

        const pricesJson = await pricesRes.json();
        const intradayJson = await intradayRes.json();

        if (!ignore) {
          setPrices(pricesJson);
          setHistory(() => {
            const next = {};
            for (const [ticker, points] of Object.entries(intradayJson || {})) {
              if (!Array.isArray(points)) continue;
              next[ticker] = points
                .map(({ time, price }) => {
                  const parsedTime = new Date(time);
                  return {
                    time: parsedTime,
                    price: typeof price === 'number' ? price : Number(price),
                  };
                })
                .filter(
                  (point) =>
                    point.time.toString() !== 'Invalid Date' &&
                    typeof point.price === 'number' &&
                    !Number.isNaN(point.price),
                );
            }
            return next;
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Unable to load pricing data');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchData();

    const interval = setInterval(fetchData, 5000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const tickersToDisplay = STOCK_CATEGORIES[activeCategory] ?? [];
  const readyTickers = tickersToDisplay.filter((ticker) => prices[ticker]);
  const missingTickers = tickersToDisplay.filter((ticker) => !prices[ticker]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>📈 Market Watch</h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Track live prices and intraday momentum across your favourite asset classes.
          </p>
        </div>
        <label style={{ display: 'grid', gap: 6, minWidth: 220 }}>
          <span style={{ fontSize: 13, color: '#475569' }}>Category</span>
          <select
            value={activeCategory}
            onChange={(event) => setActiveCategory(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5f5',
              background: '#f8fafc',
              fontSize: 14,
            }}
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div style={{ marginTop: 40 }}>Loading live data…</div>
      ) : (
        <>
          {error && (
            <div style={{ marginTop: 24, padding: 12, borderRadius: 8, background: '#fee2e2', color: '#b91c1c' }}>
              {error}
            </div>
          )}

          <h2 style={{ marginTop: 32, marginBottom: 16 }}>{CATEGORY_LABELS[activeCategory]}</h2>

          <ul style={{ display: 'grid', gap: 16, listStyle: 'none', padding: 0 }}>
            {readyTickers.map((ticker) => {
              const price = prices[ticker];
              return (
                <li
                  key={ticker}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: 16,
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <strong style={{ fontSize: 18, letterSpacing: 0.4 }}>{ticker}</strong>
                      <span style={{ fontSize: 16, color: '#0f172a' }}>
                        {typeof price === 'number' ? formatPrice(price) : String(price)}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>updated live</span>
                  </div>
                  {history[ticker] && history[ticker].length >= 2 ? (
                    <PriceChart data={history[ticker]} height={160} />
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.6 }}>Collecting data…</div>
                  )}
                </li>
              );
            })}
          </ul>

          {missingTickers.length > 0 && (
            <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
              Waiting for data: {missingTickers.join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function NotFoundPage() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>The page you’re looking for does not exist.</p>
    </div>
  );
}

const containerStyle = {
  maxWidth: 960,
  width: '100%',
  padding: '0 24px',
  margin: '0 auto',
  boxSizing: 'border-box',
};

function App() {
  const linkStyle = ({ isActive }) => ({
    padding: '8px 12px',
    borderRadius: 6,
    textDecoration: 'none',
    color: isActive ? '#fff' : '#1f2937',
    backgroundColor: isActive ? '#1d4ed8' : 'transparent',
  });

  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#e2e8f0',
        }}
      >
        <header
          style={{
            width: '100%',
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 1px 0 rgba(15, 23, 42, 0.05)',
          }}
        >
          <div
            style={{
              ...containerStyle,
              paddingTop: 16,
              paddingBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <strong style={{ fontSize: 18 }}>StockWatch</strong>
            <nav style={{ display: 'flex', gap: 12 }}>
              <NavLink to="/" end style={linkStyle}>
                Dashboard
              </NavLink>
              <NavLink to="/watchlist" style={linkStyle}>
                Watchlist
              </NavLink>
              <NavLink to="/rules" style={linkStyle}>
                Rules
              </NavLink>
              <NavLink to="/events" style={linkStyle}>
                Events
              </NavLink>
            </nav>
          </div>
        </header>
        <main
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 32,
            paddingBottom: 32,
          }}
        >
          <div
            style={{
              ...containerStyle,
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.12)',
              paddingTop: 32,
              paddingBottom: 32,
            }}
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/watchlist" element={<WatchlistPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </main>
        <footer style={{ width: '100%', padding: '16px 0', background: '#f8fafc', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ ...containerStyle, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            © {new Date().getFullYear()} StockWatch. All rights reserved.
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
