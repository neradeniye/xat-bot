import fs from 'fs';
import {
  userOwnsItem
} from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'enable',
  async execute(message, args) {
    const requestedItem = args.join(' ').toLowerCase();
    if (!requestedItem) return message.reply(`🛠️ Please specify the item you want to enable.`);

    const item = shopItems.find(i =>
      i.type === 'item' &&
      i.name.toLowerCase() === requestedItem
    );

    if (!item) {
      return message.reply(`❌ That item doesn't exist.`);
    }

    if (!userOwnsItem(message.author.id, item.name)) {
      return message.reply(`🚫 You don't own **${item.name}** yet.`);
    }

    const member = message.guild.members.cache.get(message.author.id) ||
                   await message.guild.members.fetch(message.author.id);

    // Remove all other item roles
    const itemRoles = shopItems
      .filter(i => i.type === 'item')
      .map(i => i.roleId);

    try {
      await member.roles.remove(itemRoles);
      await member.roles.add(item.roleId);
      return message.reply(`✅ Item **${item.name}** is now active.`);
    } catch (err) {
      console.error('[enable] item role error:', err);
      return message.reply(`❌ Failed to enable item. Check bot role permissions.`);
    }
  }
};