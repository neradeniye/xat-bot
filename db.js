import Database from 'better-sqlite3';

const db = new Database('economy.db');

// Create table if it doesn't exist
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

export function addUserXats(userId, amount = 1) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (id, balance) VALUES (?, ?)').run(userId, amount);
  } else {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, userId);
  }
}