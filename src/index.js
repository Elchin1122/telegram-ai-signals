import 'dotenv/config';
import { createApp } from './server.js';
import { createBot } from './bot.js';
import { startWarmupCron } from './cron.js';

const port = Number(process.env.PORT || 3000);
const app = createApp();
app.listen(port, () => console.log(`Веб-сервер запущен на порту ${port}`));

if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = createBot(process.env.TELEGRAM_BOT_TOKEN, process.env.PUBLIC_URL);

  function startBot(delayMs = 0) {
    setTimeout(() => {
      bot.launch()
        .then(() => {
          console.log('Бот запущен и слушает команды (long polling)');
          startWarmupCron(bot);
        })
        .catch((err) => {
          console.error('Не удалось запустить бота, повтор через 5 сек:', err.message || err);
          setTimeout(() => startBot(), 5000);
        });
    }, delayMs);
  }
  // Небольшая пауза перед первым запуском — даёт время предыдущему инстансу
  // отпустить long-polling соединение с Telegram (иначе 409 Conflict).
  startBot(3000);

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.log('TELEGRAM_BOT_TOKEN не задан — запущен только веб-сервер, без бота.');
}

// Self-ping: каждые 10 минут стучимся сами на себя, чтобы бесплатный тариф Render
// не усыплял сервис из-за отсутствия входящих запросов.
if (process.env.PUBLIC_URL) {
  const PING_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(async () => {
    try {
      const res = await fetch(`${process.env.PUBLIC_URL}/api/health`, { signal: AbortSignal.timeout(10000) });
      console.log(`Self-ping: ${res.status} (${new Date().toISOString()})`);
    } catch (err) {
      console.error('Self-ping не удался:', err.message || err);
    }
  }, PING_INTERVAL_MS);
} else {
  console.log('PUBLIC_URL не задан — self-ping выключен.');
}
