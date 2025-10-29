import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

function RulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    ticker: '',
    direction: 'above',
    price: '',
  });

  const loadRules = async (options = {}) => {
    const { ignore } = options;
    setLoading((current) => (options.silent ? current : true));
    if (!options.silent) {
      setError(null);
    }

    try {
      const res = await fetch(`${API_BASE}/rules`);
      if (!res.ok) {
        throw new Error(`Failed to load rules (status ${res.status})`);
      }
      const data = await res.json();
      if (!(ignore && ignore.current)) {
        setRules(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      if (!(ignore && ignore.current)) {
        setError(err instanceof Error ? err.message : 'Unable to load rules');
      }
    } finally {
      if (!(ignore && ignore.current) && !options.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const ignore = { current: false };
    loadRules({ ignore });
    return () => {
      ignore.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ticker = formState.ticker.trim();
    const priceValue = Number(formState.price);

    if (!ticker) {
      setError('Enter a ticker symbol before saving.');
      return;
    }
    if (!Number.isFinite(priceValue)) {
      setError('Enter a numeric price target.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          direction: formState.direction,
          price: priceValue,
        }),
      });
      const payload = await res.json();

      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.error || `Unable to create rule for ${ticker.toUpperCase()}`);
      }

      setFormState({
        ticker: '',
        direction: 'above',
        price: '',
      });
      await loadRules({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ruleId) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/rules/${ruleId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`Failed to delete rule #${ruleId}`);
      }
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete rule');
    } finally {
      setSubmitting(false);
    }
  };

  const rows = useMemo(() => {
    return rules.map((rule) => {
      const createdAt = rule.created_at ? new Date(rule.created_at) : null;
      return {
        ...rule,
        createdLabel:
          createdAt && !Number.isNaN(createdAt.valueOf()) ? createdAt.toLocaleString() : '—',
      };
    });
  }, [rules]);

  return (
    <div>
      <h1>Rules</h1>
      <p>
        Define alert rules that watch market conditions and notify you when they trigger.
        Each entry is stored in SQLite through the FastAPI backend.
      </p>

      <section style={{ maxWidth: 960 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Existing Rules</h2>
            <p style={{ opacity: 0.7, marginTop: 0 }}>
              Loaded directly from the `/rules` endpoint. Delete a row to sync the database.
            </p>
          </div>
          <button type="button" onClick={() => loadRules()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error && (
          <div style={{ marginTop: 12, color: '#c0392b' }}>
            {error}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px 12px' }}>ID</th>
              <th style={{ padding: '8px 12px' }}>Ticker</th>
              <th style={{ padding: '8px 12px' }}>Direction</th>
              <th style={{ padding: '8px 12px' }}>Price</th>
              <th style={{ padding: '8px 12px' }}>Created</th>
              <th style={{ padding: '8px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td style={{ padding: '12px', opacity: 0.7 }} colSpan={6}>
                  No rules yet—use the form below to create one.
                </td>
              </tr>
            ) : (
              rows.map((rule) => (
                <tr key={rule.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                  <td style={{ padding: '12px' }}>{rule.id}</td>
                  <td style={{ padding: '12px' }}>
                    <strong>{rule.ticker}</strong>
                  </td>
                  <td style={{ padding: '12px', textTransform: 'capitalize' }}>{rule.direction}</td>
                  <td style={{ padding: '12px' }}>${Number(rule.price).toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>{rule.createdLabel}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      disabled={submitting}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section style={{ maxWidth: 640, marginTop: 32 }}>
        <h2>Create Rule</h2>
        <p style={{ opacity: 0.7 }}>
          Submitting this form sends a JSON payload to `/rules`. Any validation errors are surfaced below.
        </p>

        <form
          style={{ display: 'grid', gap: 12, marginTop: 12, maxWidth: 480 }}
          onSubmit={handleSubmit}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Ticker</span>
            <input
              name="ticker"
              type="text"
              placeholder="e.g. AAPL"
              value={formState.ticker}
              onChange={handleChange}
              disabled={submitting}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Direction</span>
            <select
              name="direction"
              value={formState.direction}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="above">Price moves above target</option>
              <option value="below">Price moves below target</option>
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Price Target</span>
            <input
              name="price"
              type="number"
              step="0.01"
              placeholder="e.g. 180"
              value={formState.price}
              onChange={handleChange}
              disabled={submitting}
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create Rule'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default RulesPage;
