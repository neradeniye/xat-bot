import fs from 'fs';
import {
  getUserBalance,
  addUserXats,
  userOwnsItem,
  giveUserItem
} from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'buy',
  async execute(message, args) {
    console.log(`[BUY] Command triggered by ${message.author.tag}`);

    const itemName = args.join(' ').toLowerCase();
    if (!itemName) return message.reply(`Please specify an item to buy.`);

    const item = shopItems.find(i => i.name.toLowerCase().includes(itemName));
    if (!item) {
      console.log(`[BUY] Item not found: ${itemName}`);
      return message.reply(`❌ Item not found.`);
    }

    const userId = message.author.id;
    const balance = getUserBalance(userId);

    // Check ownership
    if (userOwnsItem(userId, item.name)) {
      return message.reply(`🛑 You already own **${item.name}**.`);
    }

    const price = item.type === 'color' ? config.colorRolePrice : item.price;
    
    if (balance < price) {
        return message.reply(`❌ You need ${price} ${xatEmoji}, but you only have ${balance}.`);
    }

addUserXats(userId, -price);
giveUserItem(userId, item.name);

 // Assign role if applicable
    if (item.roleId) {
      const role = message.guild.roles.cache.get(item.roleId);
      if (!role) return message.reply(`❌ Role not found on this server.`);

      const member = message.guild.members.cache.get(userId) || await message.guild.members.fetch(userId);

      try {
        // Remove all other roles of the same type (item or color)
        const sameTypeRoles = shopItems
          .filter(i => i.type === item.type)
          .map(i => i.roleId);

        await member.roles.remove(sameTypeRoles);
        await member.roles.add(role);

        return message.reply(`✅ You bought **${item.name}** for ${price} ${xatEmoji} and received the role!`);
      } catch (err) {
        console.error('[BUY] Failed to assign role:', err);
        return message.reply(`❌ Failed to assign role. Make sure I have permission to manage roles.`);
      }
    }

    return message.reply(`✅ You bought **${item.name}** for ${item.price} ${xatEmoji}.`);
  }
};