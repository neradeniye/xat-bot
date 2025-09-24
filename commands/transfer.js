import { getUserBalance, addUserXats, getUserItem, addUserItem, removeUserItem } from '../db.js';

export default {
  name: 'transfer',
  aliases: ['give', 'send'],
  async execute(message, args) {
    const target = message.mentions.users.first();
    const thing = args[1]; // could be a number (xats) or string (item name)

    if (!target || !thing) {
      return message.reply('❌ Usage: `.x transfer @user <amount|item>`');
    }

    if (target.id === message.author.id) {
      return message.reply('🤨 You can’t send things to yourself.');
    }

    const senderId = message.author.id;
    const recipientId = target.id;

    // ✅ Case 1: transferring xats
    if (!isNaN(thing)) {
      const amount = parseInt(thing, 10);
      if (amount <= 0) {
        return message.reply('❌ Amount must be a positive whole number.');
      }

      const senderBalance = getUserBalance(senderId);
      if (senderBalance < amount) {
        return message.reply(`❌ You don’t have enough xats. You currently have **${senderBalance}**.`);
      }

      addUserXats(senderId, -amount);
      addUserXats(recipientId, amount);

      return message.reply(`✅ You sent **${amount} xats** to **${target.username}**.`);
    }

    // ✅ Case 2: transferring items
    const itemName = thing.toLowerCase();

    // Check if sender has item
    const senderItem = getUserItem(senderId, itemName);
    if (!senderItem || senderItem.quantity <= 0) {
      return message.reply(`❌ You don’t have any **${itemName}** to send.`);
    }

    // Remove from sender and add to recipient
    removeUserItem(senderId, itemName, 1);
    addUserItem(recipientId, itemName, 1);

    return message.reply(`✅ You sent **1 ${itemName}** to **${target.username}**.`);
  }
};