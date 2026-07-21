import 'dotenv/config';
import { Telegraf } from 'telegraf';

export function createBot(token, webAppUrl) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN не задан в .env');

  const bot = new Telegraf(token);

  bot.start((ctx) => {
    const text =
      'Привет! Я бот с вероятностными сигналами по валютным парам (ВВЕРХ / ВНИЗ / ПРОПУСТИТЬ).\n\n' +
      (webAppUrl
        ? 'Нажми кнопку «Сигналы» рядом со строкой ввода сообщения, чтобы открыть аналитику.\n\n'
        : '') +
      'Команды:\n' +
      '/start — это сообщение\n' +
      '/help — справка';

    return ctx.reply(text);
  });

  bot.help((ctx) => {
    ctx.reply(
      'Это MVP-бот сигналов. Модель не гарантирует доход и не размещает сделки — ' +
      'решения принимает пользователь.'
    );
  });

  return bot;
}

// Позволяет по-прежнему запускать `node src/bot.js` отдельно (long polling, без веб-сервера).
if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = createBot(process.env.TELEGRAM_BOT_TOKEN, process.env.PUBLIC_URL);
  bot.launch().then(() => console.log('Бот запущен и слушает команды (long polling)'));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
