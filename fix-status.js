// reset-profiles.js
import { db } from './db.js';

console.log('Deleting broken user_profiles table...');

db.prepare('DROP TABLE IF EXISTS user_profiles').run();

db.prepare(`
  CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'Use .x setstatus <text>',
    banner TEXT DEFAULT 'default'
  )
`).run();

console.log('user_profiles table recreated!');
console.log('Bot will now start 100%');
console.log('All statuses reset — users just run .x setstatus again');

process.exit();