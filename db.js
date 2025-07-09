const Database = require('better-sqlite3');
const db = new Database('./xats.sqlite'); // or './xats.sqlite'

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    xats INTEGER DEFAULT 0
  )
`).run();

module.exports = db;