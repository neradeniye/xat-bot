import fs from 'fs';
import { EmbedBuilder } from 'discord.js';
import { userOwnsItem } from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'inventory',
  description: 'View yours or someone else\'s inventory',
  usage: '.x inventory [@user]',

  async execute(message, args) {
    // Determine target user
    let targetMember;
    let targetUser;

    if (args.length === 0 || !message.mentions.users.size) {
      // No mention → show own inventory
      targetMember = message.member;
      targetUser = message.author;
    } else {
      // Mentioned user
      targetUser = message.mentions.users.first();
      targetMember = message.guild.members.cache.get(targetUser.id)
        || await message.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return message.reply('That user isn\'t in this server or couldn\'t be found.');
      }
    }

    const userId = targetUser.id;
    const hasRole = roleId => targetMember?.roles.cache.has(roleId);

    // Filter owned items
    const ownedColors = shopItems.filter(
      i => i.type === 'color' && userOwnsItem(userId, i.name)
    );

    const ownedItems = shopItems.filter(
      i => i.type === 'item' && userOwnsItem(userId, i.name)
    );

    // Build color section
    let colorSection = '';
    for (const color of ownedColors) {
      const active = hasRole(color.roleId) ? 'Active' : 'Inactive';
      colorSection += `${active} <@&${color.roleId}>\n`;
    }
    if (!colorSection) colorSection = '_None_';

    // Build item section
    let itemSection = '';
    for (const item of ownedItems) {
      const active = hasRole(item.roleId) ? 'Active' : 'Inactive';
      const emoji = item.emoji ?? '';
      itemSection += `${active} ${emoji} **${item.name}**\n`;
    }
    if (!itemSection) itemSection = '_None_';

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Inventory`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Owned Colors', value: colorSection, inline: false },
        { name: 'Owned Items', value: itemSection, inline: false }
      )
      .setFooter({
        text: targetUser.id === message.author.id
          ? 'Use .x enable / .x disable to toggle items'
          : 'This is a public view — only you can toggle your own items'
      });

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};