import { setUserStatus } from '../db.js';

export default {
  name: 'status',
  description: 'Set your profile status (100 chars max)',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Usage: `.x status I own 7 emeralds`');
    }

    const status = args.join(' ').trim();
    if (status.length > 100) {
      return message.reply('Status too long! Max 100 characters.');
    }

    setUserStatus(message.author.id, status);
    await message.reply(`Status updated!\n> "${status}"`);
  }
};