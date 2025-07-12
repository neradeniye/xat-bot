import fs from 'fs';
import { EmbedBuilder } from 'discord.js';
import { userOwnsItem } from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'inventory',
  execute(message) {
    const userId = message.author.id;
    const ownedItems = getUserItems(userId);

    const colors = ownedItems.filter(name =>
      shopItems.find(i => i.name.toLowerCase() === name.toLowerCase() && i.type === 'color')
    );

    const items = ownedItems.filter(name =>
      shopItems.find(i => i.name.toLowerCase() === name.toLowerCase() && i.type === 'item')
    );

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${message.author.username}'s Inventory`)
      .setColor(0x00bcd4);

    if (colors.length > 0) {
      const colorDisplay = colors.map(name => {
        const item = shopItems.find(i => i.name.toLowerCase() === name.toLowerCase());
        return item ? `<@&${item.roleId}>` : name;
      }).join('\n');

      embed.addFields({ name: '🎨 Colors', value: colorDisplay, inline: false });
    }

    if (items.length > 0) {
      const itemDisplay = items.map(name => {
        const item = shopItems.find(i => i.name.toLowerCase() === name.toLowerCase());
        const emoji = item?.emoji ?? '';
        return `${emoji} **${name}**`;
      }).join('\n');

      embed.addFields({ name: '🔹 Items', value: itemDisplay, inline: false });
    }

    if (colors.length === 0 && items.length === 0) {
      embed.setDescription('You don’t own any colors or items yet.');
    }

    message.reply({ embeds: [embed], allowedMentions: { parse: ['roles'] } });
  }
};