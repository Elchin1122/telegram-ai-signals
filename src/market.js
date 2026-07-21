const supportedPairs = new Set(['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/JPY']);

function seededNoise(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function demoCandles(pair, interval = '1min', count = 120) {
  const bases = { 'EUR/USD': 1.086, 'GBP/USD': 1.278, 'USD/JPY': 157.4, 'AUD/USD': 0.668, 'USD/CAD': 1.365, 'EUR/JPY': 171.0 };
  let price = bases[pair] ?? 1;
  const candles = [];
  const stepMs = interval === '5min' ? 300000 : interval === '15min' ? 900000 : 60000;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const t = now - i * stepMs;
    const drift = Math.sin((count - i) / 11) * price * 0.00012;
    const noise = (seededNoise(Math.floor(t / stepMs) + pair.length) - 0.5) * price * 0.0007;
    const open = price;
    const close = Math.max(0.00001, open + drift + noise);
    const wick = Math.abs(noise) * 0.7 + price * 0.00008;
    candles.push({ time: new Date(t).toISOString(), open, high: Math.max(open, close) + wick, low: Math.min(open, close) - wick, close });
    price = close;
  }
  return candles;
}

export async function getCandles(pair, interval, count = 120) {
  if (!supportedPairs.has(pair)) throw new Error('Unsupported pair');
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return { source: 'demo', candles: demoCandles(pair, interval, count) };

  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', pair);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', String(count));
  url.searchParams.set('apikey', apiKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Market data error ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.values)) throw new Error(data.message || 'Invalid market data response');
  const candles = data.values.reverse().map(v => ({
    time: new Date(v.datetime + 'Z').toISOString(),
    open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close)
  }));
  return { source: 'twelvedata', candles };
}
