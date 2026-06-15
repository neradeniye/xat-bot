// commands/removebanner.js
import { removeUserBanner, getUserBanner } from '../db.js';

export default {
  name: 'removebanner',
  async execute(message) {
    const currentBanner = getUserBanner(message.author.id);

    if (!currentBanner) {
      return message.reply('You don’t have a custom banner set.');
    }

    removeUserBanner(message.author.id);

    await message.reply({
      content: '✅ **Custom banner removed.** Your profile will now use the default background.',
      allowedMentions: { repliedUser: false }
    });
  }
};