import Database from 'better-sqlite3';

const db = new Database('economy.db');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0
  )
`).run();

export function getUserBalance(userId) {
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (id, balance) VALUES (?, 0)').run(userId);
    return 0;
  }
  return user.balance;
}