import { 
  getUserBalance, 
  addUserXats, 
  userOwnsItem, 
  giveUserItem, 
  removeUserItem 
} from '../db.js';

const itemName = thing.toLowerCase();

export default {
  name: 'transfer',
  aliases: ['give', 'send'],
  async execute(message, args) {
    const target = message.mentions.users.first();

    if (!target) {
      return message.reply('❌ Usage: `.x transfer @user <amount|item>`');
    }

    // everything after the mention is the "thing" (could be number or item name with spaces)
    const thing = args.slice(1).join(' ').trim();

    if (!thing) {
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

    if (!userOwnsItem(senderId, itemName)) {
      return message.reply(`❌ You don’t own a **${itemName}** to send.`);
    }

    // remove from sender and add to recipient
    removeUserItem(senderId, itemName);
    giveUserItem(recipientId, itemName);

    return message.reply(`✅ You sent **1 ${itemName}** to **${target.username}**.`);
  }
};