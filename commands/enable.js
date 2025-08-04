import fs from 'fs';
import { userOwnsItem, setItemEnabled, clearItemEnabled } from '../db.js';

const emeraldRoles = JSON.parse(fs.readFileSync('./emerald_roles.json', 'utf-8'));
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'enable',
  async execute(message, args) {
    const input = args.join(' ').toLowerCase();
    if (!input) return message.reply(`Please specify the item or color you want to enable.`);

    const item = shopItems.find(i => i.name.toLowerCase() === input);
    if (!item) return message.reply(`❌ That item or color doesn't exist.`);

    if (!userOwnsItem(message.author.id, item.name)) {
      return message.reply(`🚫 You haven't bought **${item.name}** yet.`);
    }

    const member = message.guild.members.cache.get(message.author.id) ||
                   await message.guild.members.fetch(message.author.id);

    const isPawn = item.name.toLowerCase().includes('pawn');

    if (isPawn) {
      // ✅ Remove ALL pawn roles and clear from DB
      const allPawns = shopItems.filter(i => i.name.toLowerCase().includes('pawn'));
      for (const pawn of allPawns) {
        const role = message.guild.roles.cache.get(pawn.roleId);
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role).catch(err => {
            console.error(`[ERROR] Failed to remove pawn role ${role.name}:`, err);
          });
        }
        clearItemEnabled(message.author.id, pawn.name);
      }

      // ✅ Also remove emerald display roles
      for (const role of emeraldRoles) {
        const emeraldRole = message.guild.roles.cache.get(role.roleId);
        if (emeraldRole && member.roles.cache.has(emeraldRole.id)) {
          await member.roles.remove(emeraldRole).catch(err => {
            console.error(`[ERROR] Failed to remove emerald display role ${emeraldRole.name}:`, err);
          });
        }
      }
    }

    // 🟡 Remove conflicts within same type group (color/item)
    const typeGroup = item.type === 'color'
      ? shopItems.filter(i => i.type === 'color').map(i => i.roleId)
      : shopItems.filter(i => i.type === 'item').map(i => i.roleId);

    try {
      await member.roles.remove(typeGroup);
      await member.roles.add(item.roleId);
      setItemEnabled(message.author.id, item.name);
      return message.reply(`✅ **${item.name}** has been enabled.`);
    } catch (err) {
      console.error('[enable] error:', err);
      return message.reply(`❌ Failed to enable **${item.name}**. Check my permissions.`);
    }
  }
};