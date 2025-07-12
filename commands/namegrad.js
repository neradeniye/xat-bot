import fs from 'fs';
import { EmbedBuilder } from 'discord.js';
import {
  getUserGradient,
  setUserGradient
} from '../db.js';

const gradients = JSON.parse(fs.readFileSync('./gradients.json', 'utf-8'));

export default {
  name: 'namegrad',
  async execute(message, args) {
    const member = await message.guild.members.fetch(message.author.id);
    const hasBoost = member.premiumSince || member.roles.cache.some(r => r.tags?.premiumSubscriber);

    // Show list
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setTitle('🌈 Available Gradient Roles')
        .setColor(0xff66cc)
        .setDescription('Boosters can activate one using `.x namegrad <name>`.\n\n' +
          Object.entries(gradients).map(([name, id]) => `• **${name}** — <@&${id}>`).join('\n'))
        .setFooter({ text: 'Use .x namegrad <name> to apply a gradient, or `.x namegrad remove` to deactivate.' });

      return message.reply({
        embeds: [embed],
        allowedMentions: { parse: ['roles'] }
      });
    }

    const choice = args[0].toLowerCase();

    // Handle removal
    if (choice === 'remove') {
      const record = getUserGradient(message.author.id);
      if (!record) {
        return message.reply('❌ You do not have a gradient role set.');
      }

      const role = message.guild.roles.cache.get(record.role_id);
      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return message.reply(`🗑️ Your gradient role has been removed.`);
      } else {
        return message.reply('ℹ️ You already have no gradient role assigned.');
      }
    }

    // Handle activation
    const roleId = gradients[choice];
    if (!roleId) {
      return message.reply('❌ That gradient does not exist. Use `.x namegrad` to view available options.');
    }

    if (!hasBoost) {
      return message.reply('🚫 This feature is for server boosters only.');
    }

    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.reply('❌ That role no longer exists.');

    const prev = getUserGradient(message.author.id);
    if (prev?.role_id && prev.role_id !== roleId) {
      const prevRole = message.guild.roles.cache.get(prev.role_id);
      if (prevRole) await member.roles.remove(prevRole);
    }

    await member.roles.add(role);
    setUserGradient(message.author.id, roleId);

    return message.reply(`✅ Gradient **${role.name}** has been applied!`);
  }
};