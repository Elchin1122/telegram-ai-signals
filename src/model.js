function ema(values, period) {
  const k = 2 / (period + 1);
  let out = values[0];
  for (let i = 1; i < values.length; i++) out = values[i] * k + out * (1 - k);
  return out;
}
function rsi(values, period = 14) {
  let gains = 0, losses = 0;
  const start = Math.max(1, values.length - period);
  for (let i = start; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

export function predictDirection(candles) {
  if (!candles || candles.length < 40) throw new Error('Not enough candles');
  const closes = candles.map(c => c.close);
  const last = closes.at(-1);
  const fast = ema(closes.slice(-30), 8);
  const slow = ema(closes.slice(-50), 21);
  const momentum = (last / closes.at(-6) - 1) * 10000;
  const trend = (fast / slow - 1) * 10000;
  const rsiValue = rsi(closes, 14);
  const recentReturns = closes.slice(-21).map((v, i, a) => i ? v / a[i - 1] - 1 : 0).slice(1);
  const volatility = Math.sqrt(recentReturns.reduce((s, x) => s + x * x, 0) / recentReturns.length) * 10000;

  const rawScore = 0.42 * trend + 0.28 * momentum + 0.025 * (rsiValue - 50) - 0.06 * Math.max(0, volatility - 4);
  const pUp = sigmoid(rawScore / 2.8);
  const confidence = Math.round(Math.max(pUp, 1 - pUp) * 100);
  const direction = confidence < 56 ? 'WAIT' : pUp >= 0.5 ? 'UP' : 'DOWN';

  return {
    direction,
    confidence: direction === 'WAIT' ? Math.min(confidence, 55) : confidence,
    probabilityUp: Math.round(pUp * 100),
    indicators: { ema8: fast, ema21: slow, rsi14: Math.round(rsiValue * 10) / 10, momentum5: Math.round(momentum * 100) / 100, volatility: Math.round(volatility * 100) / 100 },
    explanation: direction === 'UP'
      ? 'Краткосрочный импульс и быстрая EMA находятся выше медленной EMA.'
      : direction === 'DOWN'
        ? 'Краткосрочный импульс отрицательный, быстрая EMA находится ниже медленной EMA.'
        : 'Сигналы индикаторов противоречат друг другу — вход лучше пропустить.'
  };
}
