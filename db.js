const Database = require('better-sqlite3');
const db = new Database('economy.db');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    balance INTEGER
  )
`).run();

module.exports = {
  getUser(id) {
    let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      db.prepare('INSERT INTO users (id, balance) VALUES (?, 0)').run(id);
      user = { id, balance: 0 };
    }
    return user;
  },

  addXat(id, amount) {
    const user = this.getUser(id);
    db.prepare('UPDATE users SET balance = ? WHERE id = ?')
      .run(user.balance + amount, id);
  },

  getBalance(id) {
    return this.getUser(id).balance;
  }
};