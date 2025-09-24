import { getUserBalance, addUserXats } from '../db.js';

export default {
  name: 'transfer',
  aliases: ['give', 'send'],
  async execute(message, args) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1], 10);

    if (!target || isNaN(amount) || amount <= 0) {
      return message.reply('❌ Usage: `.x transfer @user <amount>` (positive whole numbers only)');
    }

    if (target.id === message.author.id) {
      return message.reply('🤨 You can’t send xats to yourself.');
    }

    const senderId = message.author.id;
    const recipientId = target.id;

    const senderBalance = getUserBalance(senderId);

    if (senderBalance < amount) {
      return message.reply(`❌ You don’t have enough xats. You currently have **${senderBalance}**.`);
    }

    // Deduct from sender and add to recipient
    addUserXats(senderId, -amount);
    addUserXats(recipientId, amount);

    return message.reply(`✅ You sent **${amount} xats** to **${target.username}**.`);
  }
};