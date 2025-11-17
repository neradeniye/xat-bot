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
    role_id TEXT NOT NULL,
    color1 TEXT,
    color2 TEXT
  );
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS user_custom_roles (
    user_id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    role_name TEXT
  )
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

// Add this block in db.js, right after the other CREATE TABLE statements
db.prepare(`
  CREATE TABLE IF NOT EXISTS gamble_cooldowns (
    user_id TEXT PRIMARY KEY,
    last_gamble INTEGER
  );
`).run();

// SAFE PROFILE TABLE — AUTO-HEALS CORRUPTED STATUS
try {
  db.prepare('SELECT 1 FROM user_profiles LIMIT 1').run();
  console.log('user_profiles table exists and is healthy');
} catch (err) {
  console.log('BROKEN user_profiles table detected — REBUILDING...');
  db.prepare('DROP TABLE IF EXISTS user_profiles').run();
  db.prepare(`
    CREATE TABLE user_profiles (
      user_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'Use .x setstatus <text>',
      banner TEXT DEFAULT 'default'
    )
  `).run();
  console.log('CORRUPTED STATUS PURGED. TABLE REBUILT. BOT IS SAFE.');
}

// MARRIAGE SYSTEM — LOVE IS EXPENSIVE
db.prepare(`
  CREATE TABLE IF NOT EXISTS marriages (
    user1 TEXT NOT NULL,
    user2 TEXT NOT NULL,
    married_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (user1, user2)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS leavers (
    user_id TEXT PRIMARY KEY,
    leave_time INTEGER
  );
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS command_bans (
    user_id TEXT PRIMARY KEY,
    ban_end INTEGER
  );
`).run();

// Get spouse
export function getSpouse(userId) {
  const row = db.prepare(`
    SELECT user2 as spouse FROM marriages WHERE user1 = ?
    UNION
    SELECT user1 as spouse FROM marriages WHERE user2 = ?
  `).get(userId, userId);
  return row?.spouse || null;
}

// Marry (cost 1000 xats)
export function marry(user1, user2) {
  db.prepare(`
    INSERT INTO marriages (user1, user2) VALUES (?, ?)
  `).run(user1, user2);
}

// Divorce
export function divorce(userId) {
  db.prepare(`
    DELETE FROM marriages 
    WHERE user1 = ? OR user2 = ? OR user1 = ? OR user2 = ?
  `).run(userId, userId, userId, userId);
}

// Ensure user_custom_colors has color1 and color2
try {
  const cols = db.prepare("PRAGMA table_info('user_custom_colors')").all();
  const colNames = cols.map(c => c.name);

  if (!colNames.includes('color1')) {
    db.prepare("ALTER TABLE user_custom_colors ADD COLUMN color1 TEXT").run();
    console.log('[DB] Added column color1 to user_custom_colors');
  }

  if (!colNames.includes('color2')) {
    db.prepare("ALTER TABLE user_custom_colors ADD COLUMN color2 TEXT").run();
    console.log('[DB] Added column color2 to user_custom_colors');
  }
} catch (err) {
  console.error('[DB MIGRATION ERROR]', err);
}

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
    INSERT INTO user_custom_colors (user_id, role_id, color1, color2)
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

export function getUserProfile(userId) {
  try {
    return db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  } catch (err) {
    console.log('Safe fallback: status column broken, returning default');
    return { status: 'Use .x setstatus <text>', banner: 'default' };
  }
}

export function setUserStatus(userId, status) {
  let clean = status.trim();
  clean = clean.replace(/'/g, "''"); // escape quotes
  if (clean.length > 100) clean = clean.slice(0, 97) + '...';

  try {
    db.prepare(`
      INSERT INTO user_profiles (user_id, status) 
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET status = excluded.status
    `).run(userId, clean);
  } catch (err) {
    console.error('Failed to save status (table may be broken):', err.message);
  }
}

export function setUserBanner(userId, bannerName) {
  db.prepare(`
    INSERT INTO user_profiles (user_id, banner) 
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET banner = excluded.banner
  `).run(userId, bannerName);
}

export function getLastGamble(userId) {
  const row = db.prepare('SELECT last_gamble FROM gamble_cooldowns WHERE user_id = ?').get(userId);
  return row?.last_gamble ?? 0;
}

export function setLastGamble(userId, timestamp) {
  db.prepare('INSERT OR REPLACE INTO gamble_cooldowns (user_id, last_gamble) VALUES (?, ?)').run(userId, timestamp);
}

export function recordLeave(userId) {
  const timestamp = Date.now();
  db.prepare(`
    INSERT OR REPLACE INTO leavers (user_id, leave_time)
    VALUES (?, ?)
  `).run(userId, timestamp);
}

export function getLeaveRecord(userId) {
  return db.prepare('SELECT * FROM leavers WHERE user_id = ?').get(userId);
}

export function removeLeaveRecord(userId) {
  db.prepare('DELETE FROM leavers WHERE user_id = ?').run(userId);
}

export function setCommandBan(userId, banEndTimestamp) {
  db.prepare(`
    INSERT OR REPLACE INTO command_bans (user_id, ban_end)
    VALUES (?, ?)
  `).run(userId, banEndTimestamp);
}

export function getCommandBan(userId) {
  return db.prepare('SELECT * FROM command_bans WHERE user_id = ?').get(userId);
}

export function removeCommandBan(userId) {
  db.prepare('DELETE FROM command_bans WHERE user_id = ?').run(userId);
}

export { db };