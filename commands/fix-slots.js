// fix-slots.js
import { db } from './db.js';

console.log('Adding last_slots column...');

try {
  db.prepare('ALTER TABLE daily_rewards ADD COLUMN last_slots INTEGER').run();
  console.log('✅ Column added successfully!');
} catch (err) {
  if (err.message.includes('duplicate column')) {
    console.log('✅ Column already exists.');
  } else {
    console.error('Error:', err.message);
  }
}

console.log('You can now use .x slots');
process.exit();