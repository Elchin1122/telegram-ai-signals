import 'dotenv/config';
import { Telegraf, Markup, session } from 'telegraf';
import { loadUsers, saveUser } from './users.js';
import { setWarmup, getWarmup } from './warmup.js';

// ID тех, кому разрешены рассылка и настройка прогрева.
// Можно задать через .env: ADMIN_IDS=123,456
const ADMIN_IDS = (process.env.ADMIN_IDS || '7131895252')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean);

function isAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

export function createBot(token, webAppUrl) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN не задан в .env');

  const bot = new Telegraf(token);

  bot.use(session());

  // === 1. Команда /start ===
  bot.start(async (ctx) => {
    saveUser(ctx.from.id);

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

  // === 3. Команда /broadcast — разовая рассылка (только для админов) ===
  bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('⛔️ У вас нет доступа к этой команде.');
    }
    ctx.session ??= {};
    ctx.session.awaitingBroadcast = true;
    await ctx.reply('✍️ Пришлите сообщение для рассылки (текст, фото или видео). Что пришлёте — то и уйдёт всем прямо сейчас.');
  });

  // === 4. Команда /setwarmup — задать сообщение для ежедневного прогрева в 19:00 МСК ===
  bot.command('setwarmup', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('⛔️ У вас нет доступа к этой команде.');
    }
    ctx.session ??= {};
    ctx.session.awaitingWarmup = true;
    await ctx.reply('✍️ Пришлите сообщение (текст, фото или видео), которое будет уходить всем пользователям каждый день в 19:00 по Москве. Действует, пока не пришлёте новое.');
  });

  // === 5. Команда /warmupstatus — посмотреть, что сейчас задано ===
  bot.command('warmupstatus', async (ctx) => {
    if (!isAdmin(ctx.from.id)) {
      return ctx.reply('⛔️ У вас нет доступа к этой команде.');
    }
    const warmup = getWarmup();
    if (!warmup) {
      return ctx.reply('Сейчас прогрев не настроен — сообщение не задано.');
    }
    await ctx.reply(`Текущее сообщение для прогрева (установлено ${new Date(warmup.setAt).toLocaleString('ru-RU')}):`);
    await ctx.telegram.copyMessage(ctx.chat.id, warmup.chatId, warmup.messageId);
  });

  // === 6. Ловим контент от админа, если он в режиме broadcast или setwarmup ===
  bot.on('message', async (ctx, next) => {
    if (!isAdmin(ctx.from.id) || (!ctx.session?.awaitingBroadcast && !ctx.session?.awaitingWarmup)) {
      return next();
    }

    if (ctx.session.awaitingWarmup) {
      ctx.session.awaitingWarmup = false;
      setWarmup({
        chatId: ctx.chat.id,
        messageId: ctx.message.message_id,
        setBy: ctx.from.id,
        setAt: Date.now()
      });
      return ctx.reply('✅ Сообщение для прогрева сохранено. Будет уходить всем ежедневно в 19:00 по Москве.');
    }

    if (ctx.session.awaitingBroadcast) {
      ctx.session.awaitingBroadcast = false;
      const users = loadUsers();
      let sent = 0;
      let failed = 0;

      await ctx.reply(`⏳ Рассылка запущена на ${users.length} пользователей...`);

      for (const userId of users) {
        if (userId === ctx.from.id) continue;
        try {
          await ctx.telegram.copyMessage(userId, ctx.chat.id, ctx.message.message_id);
          sent++;
        } catch (e) {
          failed++;
        }
        await new Promise((r) => setTimeout(r, 40));
      }

      return ctx.reply(`✅ Рассылка завершена.\nОтправлено: ${sent}\nНе доставлено: ${failed}`);
    }
  });

  // === 7. Обработка текста (Ловим ID пользователя для Pocket Option) ===
  bot.on('text', async (ctx) => {
    if (ctx.session?.awaitingPocketId) {
      const pocketId = ctx.message.text.trim();

      if (!/^\d+$/.test(pocketId)) {
        return ctx.reply('❌ Пожалуйста, отправь только цифры твоего ID (без букв и пробелов).');
      }

      ctx.session.awaitingPocketId = false;

      await ctx.reply('⏳ Проверяю твой ID в базе брокера...');

      setTimeout(async () => {
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

  // === 8. Справка ===
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
