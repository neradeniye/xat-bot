// commands/removebanner.js
import { removeUserBanner } from '../db.js';

export default {
  name: 'removebanner',
  async execute(message) {
    if (!message.member.premiumSince) {
      return message.reply('❌ Only server boosters can manage banners!');
    }

    try {
      const record = removeUserBanner(message.author.id); // or check first
      await message.reply('✅ Your custom banner has been removed.');
    } catch (err) {
      console.error(err);
      await message.reply('❌ Failed to remove banner.');
    }
  }
};