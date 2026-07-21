import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCandles } from './market.js';
import { predictDirection } from './model.js';
import { validateTelegramInitData } from './telegramAuth.js';

export function createApp() {
  const app = express();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '50kb' }));
  app.use(express.static(path.join(__dirname, '../public')));

  app.get('/api/health', (_, res) => res.json({ ok: true }));
  app.post('/api/signal', async (req, res) => {
    try {
      const { pair = 'EUR/USD', interval = '1min', initData = '' } = req.body || {};
      const auth = process.env.TELEGRAM_BOT_TOKEN
        ? validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN)
        : { ok: true, developmentMode: true };
      if (!auth.ok) return res.status(401).json({ error: 'Telegram authorization failed' });

      const market = await getCandles(pair, interval, 120);
      const prediction = predictDirection(market.candles);
      res.json({ pair, interval, source: market.source, generatedAt: new Date().toISOString(), prediction, candles: market.candles.slice(-40) });
    } catch (error) {
      res.status(400).json({ error: error.message || 'Request failed' });
    }
  });

  return app;
}

// Позволяет по-прежнему запускать `node src/server.js` отдельно для локальной разработки веб-части.
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  app.listen(Number(process.env.PORT || 3000), () => console.log(`Mini App running on port ${process.env.PORT || 3000}`));
}
