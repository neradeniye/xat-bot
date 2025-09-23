import Database from 'better-sqlite3';

//const db = new Database('economy.db');
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

db.prepare(`
  CREATE TABLE IF NOT EXISTS user_custom_colors (
    user_id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL
    color1 TEXT,
    color2 TEXT
  );
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS daily_rewards (
    user_id TEXT PRIMARY KEY,
    last_claim INTEGER
  );
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS user_gradients (
    user_id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL
  );
`).run();

// ✅ Create message_counts table
db.prepare(`
  CREATE TABLE IF NOT EXISTS message_counts (
    user_id TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  );
`).run();

// Track enabled items
db.prepare(`
  CREATE TABLE IF NOT EXISTS enabled_items (
    userId TEXT NOT NULL,
    itemName TEXT NOT NULL,
    PRIMARY KEY (userId, itemName)
  );
`).run();

export function isItemEnabled(userId, itemName) {
  const row = db.prepare(`
    SELECT 1 FROM enabled_items WHERE userId = ? AND itemName = ?
  `).get(userId, itemName);
  return !!row;
}

export function setItemEnabled(userId, itemName) {
  db.prepare(`
    INSERT OR REPLACE INTO enabled_items (userId, itemName)
    VALUES (?, ?)
  `).run(userId, itemName);
}

export function clearItemEnabled(userId, itemName) {
  db.prepare('DELETE FROM enabled_items WHERE userId = ? AND itemName = ?').run(userId, itemName);
}

export function setUserGradient(userId, roleId) {
  db.prepare(`
    INSERT INTO user_gradients (user_id, role_id)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET role_id = excluded.role_id
  `).run(userId, roleId);
}

export function removeUserGradient(userId) {
  db.prepare(`DELETE FROM user_gradients WHERE user_id = ?`).run(userId);
}

export function getUserGradient(userId) {
  return db.prepare(`SELECT role_id FROM user_gradients WHERE user_id = ?`).get(userId);
}

export function getLastDailyClaim(userId) {
  const row = db.prepare('SELECT last_claim FROM daily_rewards WHERE user_id = ?').get(userId);
  return row?.last_claim ?? 0;
}

export function setLastDailyClaim(userId, timestamp) {
  db.prepare('INSERT OR REPLACE INTO daily_rewards (user_id, last_claim) VALUES (?, ?)').run(userId, timestamp);
}

export function getUserColorRole(userId) {
  return db.prepare('SELECT role_id FROM user_custom_colors WHERE user_id = ?').get(userId);
}

export function setUserColorRole(userId, roleId, color1, color2) {
  db.prepare(`
    INSERT INTO user_custom_colors (user_id, role_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET role_id = excluded.role_id
  `).run(userId, roleId);
}

export function removeUserColorRole(userId) {
  db.prepare('DELETE FROM user_custom_colors WHERE user_id = ?').run(userId);
}

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
  db.prepare('DELETE FROM user_items WHERE userId = ? AND itemName = ?').run(userId, itemName);
}

export function clearAllData() {
  const deletedUsers = db.prepare('DELETE FROM users').run();
  const deletedItems = db.prepare('DELETE FROM user_items').run();
  console.log(`[cleardata] Removed ${deletedUsers.changes} users and ${deletedItems.changes} item records.`);
}

// ✅ Increment a user's message count
export function incrementMessageCount(userId) {
  db.prepare(`
    INSERT INTO message_counts (user_id, count)
    VALUES (?, 1)
    ON CONFLICT(user_id) DO UPDATE SET count = count + 1
  `).run(userId);
}

// ✅ Get top user by message count
export function getTopMessageUser() {
  return db.prepare('SELECT user_id, count FROM message_counts ORDER BY count DESC LIMIT 1').get();
}

export function resetMessageCounts() {
  db.prepare('DELETE FROM message_counts').run();
}

export { db };