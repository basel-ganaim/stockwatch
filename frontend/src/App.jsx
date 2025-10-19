import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function App() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState({});

function PriceChart({ data, height = 160}) {
  const formatted = data.map((d) => ({
    time: d.time.toLocaleTimeString(), price: d.price, }));
    return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
          <Tooltip />
          <Line type="monotone" dataKey="price" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
  
}
  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("http://127.0.0.1:8000/prices");
        const data = await res.json();

        setPrices(data);

        const now = new Date();
  setHistory((prev) => {
  const next = { ...prev };
  for (const [t, p] of Object.entries(data)) {
    if (typeof p !== "number") continue;
    const arr = next[t] ? [...next[t]] : [];
    arr.push({ time: now, price: p });
    // keep only last 60 points (about 2–5 minutes depending on your poll interval)
    if (arr.length > 60) arr.shift();
    next[t] = arr;
  }
  return next;
});

    } catch (err) {
      console.error("Error fetching prices:", err);
    } finally {
      setLoading(false);
    }
    }

    fetchPrices();

    const interval = setInterval(fetchPrices, 2000);  
    return () => clearInterval(interval);

  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      {/* <h1> creates a heading, curly braces {} insert dynamic JS values */}
      <h1>📈 Stock Prices</h1>

      {/* <ul> is an unordered list — we loop over prices to create <li> for each stock */}
      <ul>
    {Object.entries(prices).map(([ticker, price]) => (
      /* 'key' helps React identify elements in lists efficiently */
      <li key={ticker} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8, border: "1px solid #eee", borderRadius: 8 }}>
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <strong style={{ width: 70 }}>{ticker}:</strong>{" "}
    {typeof price === "number" ? `$${price.toFixed(2)}` : String(price)}
  </div>

  {/* Chart only if we have a few points */}
  {history[ticker] && history[ticker].length >= 2 ? (
    <PriceChart data={history[ticker]} height={120} />
  ) : (
    <div style={{ fontSize: 12, opacity: 0.6 }}>Collecting data…</div>
  )}
      </li>
      ))}
      </ul>
    </div>
  );
}
export default App;