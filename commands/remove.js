import fs from 'fs';
import { addUserXats, removeUserItem, userOwnsItem, getUserColorRole, removeUserColorRole } from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'remove',
  async execute(message, args) {
    const type = args[0]?.toLowerCase();

    // === USER SELF-REMOVE CUSTOM COLOR ===
    if (type === 'custom' && args.length === 1) {
      const userId = message.author.id;
      const guild = message.guild;

      const record = getUserColorRole(userId);
      if (!record) {
        return message.reply('ℹ️ You don’t have a custom color role to remove.');
      }

      const role = guild.roles.cache.get(record.role_id) || await guild.roles.fetch(record.role_id).catch(() => null);
      if (role) {
        try {
          await role.delete('User requested custom color removal');
        } catch (err) {
          console.error('[remove custom] Failed to delete role:', err);
          return message.reply('⚠️ I couldn’t delete the role. Make sure my role is high enough in the hierarchy.');
        }
      }

      removeUserColorRole(userId);
      return message.reply('✅ Your custom color has been removed.');
    }

    // === ADMIN FUNCTIONALITY ===
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You do not have permission to use this command.');
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ Mention a valid user.');

    switch (type) {
      case 'xats': {
        const amount = parseInt(args[2], 10);
        if (isNaN(amount)) return message.reply('❌ Provide a valid number of xats.');
        addUserXats(target.id, -amount);
        return message.reply(`✅ Removed ${amount} xats from ${target.username}.`);
      }

      case 'item':
      case 'color': {
        const name = args.slice(2).join(' ').toLowerCase();
        const item = shopItems.find(i => i.name.toLowerCase() === name && i.type === type);
        if (!item) return message.reply('❌ That item/color was not found in the shop.');
        if (!userOwnsItem(target.id, item.name)) return message.reply(`❌ ${target.username} does not own ${item.name}.`);

        removeUserItem(target.id, item.name);

        if (item.roleId) {
          const member = await message.guild.members.fetch(target.id);
          const role = message.guild.roles.cache.get(item.roleId);
          if (role) await member.roles.remove(role);
        }

        return message.reply(`✅ Removed ${item.name} from ${target.username}.`);
      }

      default:
        return message.reply('❌ Usage:\n• `.x remove xats|item|color @user <amount or name>`\n• `.x remove custom` to delete your own custom color');
    }
  }
};
