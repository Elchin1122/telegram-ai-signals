import cron from 'node-cron';
import { loadUsers } from './users.js';
import { getWarmup } from './warmup.js';

export function startWarmupCron(bot) {
  // '0 19 * * *' = каждый день в 19:00 по указанному timezone
  cron.schedule('0 19 * * *', async () => {
    const warmup = getWarmup();
    if (!warmup) {
      console.log('[warmup] Сообщение для прогрева не задано — рассылка пропущена.');
      return;
    }

    const users = loadUsers();
    let sent = 0;
    let failed = 0;

    console.log(`[warmup] Старт ежедневного прогрева на ${users.length} пользователей...`);

    for (const userId of users) {
      try {
        await bot.telegram.copyMessage(userId, warmup.chatId, warmup.messageId);
        sent++;
      } catch (e) {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    console.log(`[warmup] Готово. Отправлено: ${sent}, не доставлено: ${failed}`);
  }, { timezone: 'Europe/Moscow' });

  console.log('[warmup] Крон настроен: ежедневно в 19:00 по Москве.');
}
