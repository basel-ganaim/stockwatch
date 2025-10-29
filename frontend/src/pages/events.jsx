import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = async (options = {}) => {
    const { ignore } = options;
    if (!options.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch(`${API_BASE}/events`);
      if (!res.ok) {
        throw new Error(`Failed to load events (status ${res.status})`);
      }
      const data = await res.json();
      if (!(ignore && ignore.current)) {
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (!(ignore && ignore.current)) {
        setError(err instanceof Error ? err.message : 'Unable to load events');
      }
    } finally {
      if (!(ignore && ignore.current) && !options.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const ignore = { current: false };
    loadEvents({ ignore });
    const interval = setInterval(() => {
      loadEvents({ silent: true, ignore });
    }, 10000);
    return () => {
      ignore.current = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    return events.map((event) => {
      const triggeredAt = event.triggered_at ? new Date(event.triggered_at) : null;
      const numericPrice = Number(event.price);
      return {
        ...event,
        timestamp:
          triggeredAt && !Number.isNaN(triggeredAt.valueOf()) ? triggeredAt.toLocaleString() : '—',
        priceLabel: Number.isFinite(numericPrice) ? numericPrice.toFixed(2) : null,
      };
    });
  }, [events]);

  return (
    <div>
      <h1>Events</h1>
      <p>
        Review the alerts and rule executions that have fired for your watchlist. This view reads
        directly from the `/events` endpoint exposed by FastAPI.
      </p>

      <section style={{ maxWidth: 960 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Recent Events</h2>
            <p style={{ opacity: 0.7, marginTop: 0 }}>
              Refreshes every 10 seconds so new triggers appear automatically.
            </p>
          </div>
          <button type="button" onClick={() => loadEvents()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error && (
          <div style={{ marginTop: 12, color: '#c0392b' }}>
            {error}
          </div>
        )}

        <ul style={{ listStyle: 'none', padding: 0, marginTop: 16, display: 'grid', gap: 12 }}>
          {rows.length === 0 && !loading ? (
            <li style={{ opacity: 0.7 }}>No events yet—rules will append rows as they trigger.</li>
          ) : (
            rows.map((event) => (
              <li
                key={event.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 16,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <strong>{event.timestamp}</strong>
                  <span style={{ opacity: 0.7 }}>Rule #{event.rule_id}</span>
                </header>
                <div>
                  <strong>{event.ticker}</strong>{' '}
                  <span style={{ textTransform: 'capitalize' }}>{event.direction}</span>{' '}
                  <span>
                    target @ {event.priceLabel ? `$${event.priceLabel}` : '—'}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export default EventsPage;
