import { setUserGradient, getUserGradient } from '../db.js';

const gradients = {
  red: '1393727372355829921',
  blue: '1393729583794094161',
  green: 'ROLE_ID_GREEN',
  pink: 'ROLE_ID_PINK',
  purple: 'ROLE_ID_PURPLE',
  orange: 'ROLE_ID_ORANGE',
  teal: 'ROLE_ID_TEAL',
  gold: 'ROLE_ID_GOLD',
  silver: 'ROLE_ID_SILVER',
  rainbow: 'ROLE_ID_RAINBOW',
  white: 'ROLE_ID_WHITE',
  black: 'ROLE_ID_BLACK'
};

export default {
  name: 'namegrad',
  async execute(message, args) {
    const choice = args[0]?.toLowerCase();
    const roleId = gradients[choice];
    if (!roleId) {
      return message.reply('❌ That gradient does not exist. Available options: ' + Object.keys(gradients).join(', '));
    }

    const member = await message.guild.members.fetch(message.author.id);
    const hasBoost = member.premiumSince || member.roles.cache.some(role => role.tags?.premiumSubscriber);

    if (!hasBoost) {
      return message.reply('🚫 This feature is for server boosters only.');
    }

    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.reply('❌ That role no longer exists.');

    // Remove previous gradient if any
    const prev = getUserGradient(message.author.id);
    if (prev?.role_id && prev.role_id !== roleId) {
      const prevRole = message.guild.roles.cache.get(prev.role_id);
      if (prevRole) await member.roles.remove(prevRole);
    }

    await member.roles.add(role);
    setUserGradient(message.author.id, roleId);

    return message.reply(`🌈 Your gradient role has been set to **${role.name}**.`);
  }
};