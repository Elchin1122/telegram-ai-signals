import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, '../data/users.json');

function ensureFile() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
}

export function loadUsers() {
  ensureFile();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveUser(id) {
  ensureFile();
  const users = loadUsers();
  if (!users.includes(id)) {
    users.push(id);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  }
}
