import { db } from '../db.js';

export default {
  name: 'clone',
  description: 'ADMIN ONLY - Copy xats + all items from one user to another',
  usage: '.x clone @from @to',

  async execute(message, args) {
    // YOUR DISCORD ID HERE - ADD AS MANY AS YOU WANT
    const OWNER_IDS = [
      '945155519247699968', // Replace with your real ID
      // Add co-owners here if needed
    ];

    if (!OWNER_IDS.includes(message.author.id)) {
      return message.reply('This command is for bot owners only.');
    }

    if (args.length < 2) {
      return message.reply('Usage: `.x clone @from @to`');
    }

    const fromMember = message.mentions.members.first();
    const toMember = message.mentions.members.at(1);

    if (!fromMember || !toMember) {
      return message.reply('Please tag two valid users: `@from @to`');
    }

    if (fromMember.id === toMember.id) {
      return message.reply("You can't clone someone onto themselves!");
    }

    const fromId = fromMember.id;
    const toId = toMember.id;

    try {
      db.transaction(() => {
        // 1. Copy xats
        const balance = db.prepare('SELECT balance FROM users WHERE id = ?').get(fromId)?.balance || 0;
        if (balance > 0) {
          db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(balance, toId);
          db.prepare('INSERT OR IGNORE INTO users (id, balance) VALUES (?, 0)').run(toId);
        }

        // 2. Copy all owned items
        const items = db.prepare('SELECT itemName FROM user_items WHERE userId = ?').all(fromId);
        const insert = db.prepare('INSERT OR IGNORE INTO user_items (userId, itemName) VALUES (?, ?)');

        for (const { itemName } of items) {
          insert.run(toId, itemName);
        }

        // Done!
      })();

      await message.reply(
        `Cloned data from **${fromMember.user.tag}** → **${toMember.user.tag}**\n` +
        `Xats transferred: **${db.prepare('SELECT balance FROM users WHERE id = ?').get(fromId)?.balance || 0}**\n` +
        `Items copied: **${db.prepare('SELECT COUNT(*) as count FROM user_items WHERE userId = ?').get(fromId)?.count || 0}**`
      );

    } catch (err) {
      console.error('[CLONE COMMAND ERROR]', err);
      await message.reply('An error occurred. Check console.');
    }
  }
};