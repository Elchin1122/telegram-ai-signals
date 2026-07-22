import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WARMUP_FILE = path.join(__dirname, '../data/warmup.json');

function ensureFile() {
  const dir = path.dirname(WARMUP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(WARMUP_FILE)) fs.writeFileSync(WARMUP_FILE, 'null', 'utf-8');
}

// Сохраняем не сам текст, а координаты сообщения (откуда его копировать):
// chatId и messageId того чата, куда админ прислал контент для прогрева.
export function setWarmup({ chatId, messageId, setBy, setAt }) {
  ensureFile();
  fs.writeFileSync(WARMUP_FILE, JSON.stringify({ chatId, messageId, setBy, setAt }, null, 2), 'utf-8');
}

export function getWarmup() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(WARMUP_FILE, 'utf-8'));
  } catch {
    return null;
  }
}
