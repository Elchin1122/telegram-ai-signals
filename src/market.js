const supportedPairs = new Set([
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/JPY',
  'USD/CHF', 'NZD/USD', 'EUR/GBP', 'EUR/CHF', 'GBP/CHF',
  'GBP/JPY', 'AUD/JPY', 'CHF/JPY', 'CAD/JPY', 'NZD/JPY',
  'EUR/AUD', 'EUR/CAD', 'EUR/NZD', 'GBP/AUD', 'GBP/CAD', 'GBP/NZD',
  'AUD/CAD', 'AUD/CHF', 'AUD/NZD', 'NZD/CHF', 'NZD/CAD',
  'BTC/USD', 'ETH/USD', 'XAU/USD',
]);

function seededNoise(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

const STEP_MS = {
  '5sec': 5000, '15sec': 15000,
  '1min': 60000, '3min': 180000, '5min': 300000, '10min': 600000, '15min': 900000,
};
// Twelve Data (реальный источник) не отдаёт данные с шагом меньше минуты.
const SUB_MINUTE_INTERVALS = new Set(['5sec', '15sec']);

function demoCandles(pair, interval = '1min', count = 120) {
  const bases = {
    'EUR/USD': 1.086, 'GBP/USD': 1.278, 'USD/JPY': 157.4, 'AUD/USD': 0.668, 'USD/CAD': 1.365, 'EUR/JPY': 171.0,
    'USD/CHF': 0.905, 'NZD/USD': 0.612, 'EUR/GBP': 0.850, 'EUR/CHF': 0.983, 'GBP/CHF': 1.157,
    'GBP/JPY': 201.2, 'AUD/JPY': 105.1, 'CHF/JPY': 173.9, 'CAD/JPY': 115.3, 'NZD/JPY': 96.3,
    'EUR/AUD': 1.626, 'EUR/CAD': 1.482, 'EUR/NZD': 1.774, 'GBP/AUD': 1.913, 'GBP/CAD': 1.744, 'GBP/NZD': 2.086,
    'AUD/CAD': 0.912, 'AUD/CHF': 0.605, 'AUD/NZD': 1.091, 'NZD/CHF': 0.554, 'NZD/CAD': 0.836,
    'BTC/USD': 61000, 'ETH/USD': 3400, 'XAU/USD': 2400,
  };
  let price = bases[pair] ?? 1;
  const candles = [];
  const stepMs = STEP_MS[interval] ?? 60000;
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
  if (!apiKey || SUB_MINUTE_INTERVALS.has(interval)) {
    return { source: 'demo', candles: demoCandles(pair, interval, count) };
  }
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
