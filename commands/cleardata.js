import { clearAllData } from '../db.js';

export default {
  name: 'cleardata',
  async execute(message) {
    // Optional: Restrict to owner or specific role
    const ownerId = message.guild.ownerId;
    const isOwner = message.author.id === ownerId;

    if (!isOwner) {
      return message.reply('🚫 Only the server owner can use this command.');
    }

    clearAllData();
    message.reply('🧹 All user balances and ownership records have been cleared.');
  }
};