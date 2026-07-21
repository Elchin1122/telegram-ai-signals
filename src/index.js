import 'dotenv/config';
import { createApp } from './server.js';
import { createBot } from './bot.js';

const port = Number(process.env.PORT || 3000);
const app = createApp();
app.listen(port, () => console.log(`Веб-сервер запущен на порту ${port}`));

if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = createBot(process.env.TELEGRAM_BOT_TOKEN, process.env.PUBLIC_URL);
  bot.launch().then(() => console.log('Бот запущен и слушает команды (long polling)'));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.log('TELEGRAM_BOT_TOKEN не задан — запущен только веб-сервер, без бота.');
}
