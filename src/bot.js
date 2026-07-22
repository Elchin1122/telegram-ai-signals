import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';

export function createBot(token, webAppUrl) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN не задан в .env');

  const bot = new Telegraf(token);

  // Включаем поддержку сессий
  bot.use(session());

  // === 1. Команда /start ===
  bot.start(async (ctx) => {
    // Прячем кнопку "Сигналы" (Menu Button) для новых пользователей, 
    // принудительно переключая меню на стандартные команды
    try {
      await ctx.setChatMenuButton({ type: 'commands' });
    } catch (e) {
      console.error('Не удалось скрыть кнопку меню:', e);
    }

    const welcomeText = `
👉 <b>Для активации бота</b> и получения рабочей среды с 12 валютными парами и возможностью наблюдения за новостным фоном, тебе нужно создать новый аккаунт на брокере Pocket Option, по моей ссылке.

➡️ <a href="https://u3.shortink.io/register?utm_campaign=826562&utm_source=affiliate&utm_medium=sr&a=GWRoGPldXepDG9&al=1780659&ac=777&cid=968446&code=WELCOME50">Зарегистрироваться на Pocket Option</a>
`;
    
    await ctx.reply(welcomeText, { 
      parse_mode: 'HTML',
      disable_web_page_preview: true 
    });

    const rulesText = `
➡️ Вот инструкция, которая поможет тебе пройти регистрацию https://youtu.be/UpudE4bzVS4

❗️ Кроме торгового бота, ты также получишь доступ к сигналам лично от меня, доступ к моей аналитике рынка и доступ к курсу по техническому анализу!

⚠️ Регистрироваться обязательно по ссылке, иначе, бот не сможет подтвердить, что ты вступил в команду.

❕ Важно: Не давай никому свой ID, так как робот выдается только на 1 аккаунт!

❓ Возникают проблемы с активацией бота? - Пиши 👉 @FominovTrade
`;
    
    // Оставили только ОДНУ кнопку
    await ctx.reply(rulesText, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔑 Прошел регистрацию, проверь мой...', 'check_reg')]
      ])
    });
  });

  // === 2. Обработка кнопки "Прошел регистрацию" ===
  bot.action('check_reg', async (ctx) => {
    ctx.session ??= {};
    ctx.session.awaitingPocketId = true;

    const askIdText = `
❗️ Отлично!
❗️ Теперь, отправь мне свой новый ID на Pocket Option:

Как найти свой ID? ➡️ https://telegra.ph/REGISTRACIYA-04-10
`;
    
    await ctx.reply(askIdText, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.url('⚡️ ПОСМОТРЕТЬ', 'https://telegra.ph/REGISTRACIYA-04-10')]
      ])
    });
    
    await ctx.answerCbQuery();
  });

  // === 3. Обработка текста (Ловим ID пользователя) ===
  bot.on('text', async (ctx) => {
    if (ctx.session?.awaitingPocketId) {
      const pocketId = ctx.message.text.trim();

      if (!/^\d+$/.test(pocketId)) {
        return ctx.reply('❌ Пожалуйста, отправь только цифры твоего ID (без букв и пробелов).');
      }

      ctx.session.awaitingPocketId = false;

      await ctx.reply('⏳ Проверяю твой ID в базе брокера...');

      // Пауза 2 секунды
      setTimeout(async () => {
        // Устанавливаем кнопку "Сигналы" ТОЛЬКО для этого пользователя
        if (webAppUrl) {
          try {
            await ctx.setChatMenuButton({
              type: 'web_app',
              text: 'Сигналы',
              web_app: { url: webAppUrl }
            });
          } catch (e) {
            console.error('Не удалось установить кнопку меню:', e);
          }
        }

        const successText = `
✅ <b>ID успешно подтвержден!</b>

Твой аккаунт привязан к нашему алгоритму. Теперь тебе доступен полный функционал бота.

👇 <b>Нажми на появившуюся кнопку «Сигналы» слева внизу у поля ввода, чтобы открыть торговую панель!</b>
`;
        await ctx.reply(successText, { parse_mode: 'HTML' });
      }, 2000);

      return;
    }
  });

  // === 4. Справка ===
  bot.help((ctx) => {
    ctx.reply(
      '❓ <b>Справка</b>\n\nДля начала работы отправь команду /start и следуй инструкциям.',
      { parse_mode: 'HTML' }
    );
  });

  return bot;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = createBot(process.env.TELEGRAM_BOT_TOKEN, process.env.PUBLIC_URL);
  bot.launch().then(() => console.log('Бот запущен и слушает команды (long polling)'));
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}