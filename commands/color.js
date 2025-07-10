import fs from 'fs';
import {
  userOwnsItem
} from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'color',
  async execute(message, args) {
    const requestedColor = args.join(' ').toLowerCase();
    if (!requestedColor) return message.reply(`🎨 Please specify a color you own.`);

    const colorItem = shopItems.find(i =>
      i.type === 'color' &&
      i.name.toLowerCase() === requestedColor
    );

    if (!colorItem) {
      return message.reply(`❌ That color doesn't exist.`);
    }

    if (!userOwnsItem(message.author.id, colorItem.name)) {
      return message.reply(`🚫 You haven't bought **${colorItem.name}** yet.`);
    }

    const member = message.guild.members.cache.get(message.author.id) ||
                   await message.guild.members.fetch(message.author.id);

    // Remove all color roles
    const colorRoles = shopItems
      .filter(i => i.type === 'color')
      .map(i => i.roleId);

    try {
      await member.roles.remove(colorRoles);
      await member.roles.add(colorItem.roleId);

      return message.reply(`✅ Color set to **${colorItem.name}**!`);
    } catch (err) {
      console.error('[color] role error:', err);
      return message.reply(`❌ Failed to apply color. Make sure I have role permissions.`);
    }
  }
};