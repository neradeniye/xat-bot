import fs from 'fs';
import { addUserXats, giveUserItem } from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'add',
  async execute(message, args) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ You do not have permission to use this command.');
    }

    const type = args[0]?.toLowerCase();
    const target = message.mentions.users.first();
    if (!target) return message.reply('❌ Mention a valid user.');

    switch (type) {
      case 'xats': {
        const amount = parseInt(args[2], 10);
        if (isNaN(amount)) return message.reply('❌ Provide a valid number of xats.');
        addUserXats(target.id, amount);
        return message.reply(`✅ Gave ${amount} xats to ${target.username}.`);
      }

      case 'item':
      case 'color': {
        const name = args.slice(2).join(' ').toLowerCase();
        const item = shopItems.find(i => i.name.toLowerCase() === name && i.type === type);
        if (!item) return message.reply('❌ That item/color was not found in the shop.');

        giveUserItem(target.id, item.name);

        if (item.roleId) {
          const member = await message.guild.members.fetch(target.id);
          const role = message.guild.roles.cache.get(item.roleId);
          if (role) await member.roles.add(role);
        }

        return message.reply(`✅ Gave ${item.name} to ${target.username}.`);
      }

      default:
        return message.reply('❌ Usage: `.x add xats|item|color @user <amount or name>`');
    }
  }
};