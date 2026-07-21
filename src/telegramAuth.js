import crypto from 'node:crypto';

export function validateTelegramInitData(initData, botToken, maxAgeSeconds = 3600) {
  if (!initData || !botToken) return { ok: false, reason: 'Missing initData or bot token' };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'Missing hash' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  const validHash = crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));
  const authDate = Number(params.get('auth_date') || 0);
  const fresh = authDate > 0 && Math.floor(Date.now() / 1000) - authDate <= maxAgeSeconds;
  return validHash && fresh ? { ok: true } : { ok: false, reason: validHash ? 'Expired initData' : 'Invalid hash' };
}
