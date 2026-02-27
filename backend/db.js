import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const file = join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, {
  users: [],
  servers: [],
  recentIps: []
});

try {
  await db.read();
} catch {
  db.data = { users: [], servers: [], recentIps: [] };
  await db.write();
}

export default db;
