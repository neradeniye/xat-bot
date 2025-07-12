import fs from 'fs';
import { EmbedBuilder } from 'discord.js';
import {
  getUserGradient,
  setUserGradient,
  removeUserGradient
} from '../db.js';

const gradients = JSON.parse(fs.readFileSync('./gradients.json', 'utf-8'));

export default {
  name: 'namegrad',
  async execute(message, args) {
    const member = await message.guild.members.fetch(message.author.id);
    const hasBoost = member.premiumSince || member.roles.cache.some(r => r.tags?.premiumSubscriber);

    // Show list if no argument
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setTitle('🌈 Available Gradient Roles')
        .setColor(0xff66cc)
        .setDescription('Boosters can select one using `.x namegrad <name>`.\n\n' +
          Object.entries(gradients).map(([name, id]) => `• **${name}** — <@&${id}>`).join('\n'))
        .setFooter({ text: 'Use .x namegrad <name> to apply a gradient.' });

      return message.reply({
        embeds: [embed],
        allowedMentions: { parse: ['roles'] }
      });
    }

    // Otherwise try to set
    const choice = args[0]?.toLowerCase();
    const roleId = gradients[choice];

    if (!roleId) {
      return message.reply('❌ That gradient does not exist. Use `.x namegrad` to view options.');
    }

    if (!hasBoost) {
      return message.reply('🚫 This feature is for server boosters only.');
    }

    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.reply('❌ That role no longer exists.');

    // Remove previous
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