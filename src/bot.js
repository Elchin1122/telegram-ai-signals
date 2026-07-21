import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';

export function createBot(token, webAppUrl) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN не задан в .env');

  const bot = new Telegraf(token);

  bot.start((ctx) => {
    const text =
      '👋 <b>Привет! Я TradingAI Signals</b> — бот с вероятностными сигналами ' +
      'по валютным парам (ВВЕРХ / ВНИЗ / ПРОПУСТИТЬ)\n\n' +
      '📊 Анализирую рынок и присылаю сигнал с оценкой вероятности движения — ' +
      'решение всегда за тобой\n\n' +
      (webAppUrl ? '👉 Нажми кнопку ниже, чтобы открыть аналитику\n\n' : '') +
      '<b>Команды:</b>\n' +
      '/start — это сообщение\n' +
      '/help — справка';

    const keyboard = webAppUrl
      ? Markup.inlineKeyboard([
          Markup.button.webApp('📈 Открыть сигналы', webAppUrl),
        ])
      : undefined;

    return ctx.reply(text, {
      parse_mode: 'HTML',
      ...(keyboard || {}),
    });
  });

  bot.help((ctx) => {
    ctx.reply(
      '❓ <b>Справка</b>\n\n' +
      'Это MVP-бот сигналов. Модель не гарантирует доход и не размещает сделки — ' +
      'решения принимает пользователь.',
      { parse_mode: 'HTML' }
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
