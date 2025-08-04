import fs from 'fs';
import { clearItemEnabled } from '../db.js';

const emeraldRoles = JSON.parse(fs.readFileSync('./emerald_roles.json', 'utf-8'));
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'disable',
  async execute(message, args) {
    const input = args.join(' ').toLowerCase();
    if (!input) return message.reply(`Please specify the item or color you want to disable.`);

    const item = shopItems.find(i => i.name.toLowerCase() === input);
    if (!item) return message.reply(`❌ That item or color doesn't exist.`);

    const member = message.guild.members.cache.get(message.author.id) ||
                   await message.guild.members.fetch(message.author.id);

    try {
      await member.roles.remove(item.roleId);
      clearItemEnabled(message.author.id, item.name);

      // ✅ Also remove emerald display roles if disabling Emerald Pawn
      if (item.name.toLowerCase() === 'emerald pawn') {
        for (const role of emeraldRoles) {
          const emeraldRole = message.guild.roles.cache.get(role.roleId);
          if (emeraldRole && member.roles.cache.has(emeraldRole.id)) {
            await member.roles.remove(emeraldRole).catch(() => {});
            console.log(`[DEBUG] Removed emerald display role: ${emeraldRole.name}`);
          }
        }
      }

      return message.reply(`✅ **${item.name}** has been disabled.`);
    } catch (err) {
      console.error('[disable] error:', err);
      return message.reply(`❌ Failed to disable **${item.name}**.`);
    }
  }
};