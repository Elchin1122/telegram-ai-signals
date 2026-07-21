# Telegram AI Currency Signals Mini App

MVP Telegram Mini App, который показывает вероятностный сигнал **ВВЕРХ / ВНИЗ / ПРОПУСТИТЬ** по валютным парам. Он не размещает сделки и не подключается к аккаунту Pocket Option.

## Что внутри
- Telegram WebApp UI
- сервер Express
- проверка Telegram `initData`
- свечи через Twelve Data (опционально)
- демо-режим без API-ключа
- базовая модель: EMA + RSI + momentum + volatility
- предупреждение о риске

## Запуск
```bash
cp .env.example .env
npm install
npm run dev
```
Откройте `http://localhost:3000`.

## Подключение к Telegram
1. Создайте бота через @BotFather.
2. Разместите приложение на HTTPS-домене (Render, Railway, Fly.io, VPS).
3. Укажите `TELEGRAM_BOT_TOKEN` и `PUBLIC_URL` в `.env`.
4. В @BotFather используйте `/newapp` или настройте кнопку меню Web App и укажите HTTPS URL.

## Рыночные данные
Добавьте `TWELVE_DATA_API_KEY` в `.env`. Без ключа интерфейс работает на синтетических демо-свечах.

## Важно
Не обещайте пользователям точность или гарантированный доход. Перед реальным использованием нужна честная проверка модели на out-of-sample данных, журнал прогнозов, расчет win rate, калибровка вероятностей и ограничения риска.
