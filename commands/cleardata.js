import { clearAllData } from '../db.js';

export default {
  name: 'cleardata',
  async execute(message) {
    console.log('[cleardata] Command triggered');

    if (!message.guild) {
      return message.reply('⚠️ This command must be used in a server.');
    }

    const isOwner = message.author.id === message.guild.ownerId;
    if (!isOwner) {
      return message.reply('🚫 Only the server owner can use this command.');
    }

    clearAllData();
    return message.reply('🧹 All xat data has been wiped.');
  }
};