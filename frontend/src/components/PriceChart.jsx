import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const PRICE_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
  useGrouping: true,
});

export const formatPrice = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return String(value);
  }
  return `$${PRICE_FORMATTER.format(value)}`;
};

function PriceChart({ data, height = 160 }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div style={{ fontSize: 12, opacity: 0.6 }}>No intraday data yet.</div>;
  }

  const formatted = data.map((point) => ({
    time:
      point.time instanceof Date && !Number.isNaN(point.time.valueOf())
        ? point.time.toLocaleTimeString()
        : String(point.time),
    price: point.price,
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={12} />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => PRICE_FORMATTER.format(value)}
          />
          <Tooltip formatter={(value) => [`$${PRICE_FORMATTER.format(value)}`, 'Price']} />
          <Line type="monotone" dataKey="price" dot={false} strokeWidth={2} stroke="#2563eb" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PriceChart;
