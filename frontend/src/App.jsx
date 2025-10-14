import { useEffect, useState } from 'react';

function App() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("http://127.0.0.1:8000/prices");
        const data = await res.json();

        setPrices(data);
    } catch (err) {
      console.error("Error fetching prices:", err);
    } finally {
      setLoading(false);
    }
    }

    fetchPrices();

    const interval = setInterval(fetchPrices, 200);
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
      <li key={ticker}>
        <strong>{ticker}:</strong>{" "}
        {typeof price === "number" ? `$${price.toFixed(2)}` : String(price)}
      </li>
      ))}
      </ul>
    </div>
  );
}
export default App;