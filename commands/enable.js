import fs from 'fs';
import { userOwnsItem, setItemEnabled, isItemEnabled, clearItemEnabled } from '../db.js';

const emeraldRoles = JSON.parse(fs.readFileSync('./emerald_roles.json', 'utf-8'));
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
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
    const isEmeraldPawn = item.name.toLowerCase() === 'emerald pawn';

    const testRoleId = '1401823745441796189';
    const testRole = message.guild.roles.cache.get(testRoleId);

    // ✅ If enabling any non-emerald pawn, clear emerald pawn + emerald roles
          await member.roles.remove(testRole).catch(() => {});
        //}
      
    

    // Determine role conflict group
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