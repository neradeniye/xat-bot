import fs from 'fs';
import { EmbedBuilder } from 'discord.js';
import { userOwnsItem } from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'inventory',
  description: 'View yours or someone else\'s inventory (shows only owned items)',
  usage: '.x inventory [@user]',

  async execute(message, args) {
    let targetUser = message.author;
    let targetMember = message.member;

    if (message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first();
      targetMember = message.guild.members.cache.get(targetUser.id)
        || await message.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return message.reply('That user isn\'t in this server.');
      }
    }

    const userId = targetUser.id;

    // Get owned colors
    const ownedColors = shopItems
      .filter(i => i.type === 'color' && userOwnsItem(userId, i.name))
      .map(c => `<@&${c.roleId}>`)
      .join(' ') || '_None_';

    // Get owned items
    const ownedItems = shopItems
      .filter(i => i.type === 'item' && userOwnsItem(userId, i.name))
      .map(i => `${i.emoji ?? ''} **${i.name}**`)
      .join('\n') || '_None_';

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Inventory`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Colors', value: ownedColors, inline: false },
        { name: 'Items', value: ownedItems, inline: false }
      )
      .setFooter({
        text: targetUser.id === message.author.id
          ? 'Use .x enable <item> to equip'
          : 'Public inventory view'
      });

    await message.reply({
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};