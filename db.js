import Database from 'better-sqlite3';

const db = new Database('/var/xat-bot-data/economy.db');

// ✅ Create users table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0
  );
`).run();

// ✅ Create user_items table
db.prepare(`
  CREATE TABLE IF NOT EXISTS user_items (
    userId TEXT NOT NULL,
    itemName TEXT NOT NULL,
    PRIMARY KEY (userId, itemName)
  );
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

export function userOwnsItem(userId, itemName) {
  const row = db.prepare('SELECT 1 FROM user_items WHERE userId = ? AND itemName = ?').get(userId, itemName);
  return !!row;
}

export function giveUserItem(userId, itemName) {
  db.prepare('INSERT OR IGNORE INTO user_items (userId, itemName) VALUES (?, ?)').run(userId, itemName);
}

export function removeUserItem(userId, itemName) {
  db.prepare('DELETE FROM user_items WHERE user_id = ? AND item_name = ?').run(userId, itemName);
}

export function clearAllData() {
  const deletedUsers = db.prepare('DELETE FROM users').run();
  const deletedItems = db.prepare('DELETE FROM user_items').run();
  console.log(`[cleardata] Removed ${deletedUsers.changes} users and ${deletedItems.changes} item records.`);
}

