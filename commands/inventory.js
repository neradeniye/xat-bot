import fs from 'fs';
import { EmbedBuilder } from 'discord.js';
import { userOwnsItem } from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'inventory',
  async execute(message) {
    const userId = message.author.id;
    const member = message.guild.members.cache.get(userId) || await message.guild.members.fetch(userId);

    const ownedColors = shopItems.filter(
      i => i.type === 'color' && userOwnsItem(userId, i.name)
    );

    const ownedItems = shopItems.filter(
      i => i.type === 'item' && userOwnsItem(userId, i.name)
    );

    const hasRole = roleId => member.roles.cache.has(roleId);

    let colorSection = '';
    for (const color of ownedColors) {
      const active = hasRole(color.roleId) ? '✅ ' : '▫️ ';
      colorSection += `${active}<@&${color.roleId}>\n`;
    }
    if (colorSection === '') colorSection = 'You do not own any color roles.';

    let itemSection = '';
    for (const item of ownedItems) {
      const active = hasRole(item.roleId) ? '✅ ' : '▫️ ';
      itemSection += `${active}${item.name}\n`;
    }
    if (itemSection === '') itemSection = 'You do not own any items.';

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${message.author.username}'s Inventory`)
      .setColor(0x9b59b6)
      .addFields(
        { name: '🎨 Colors', value: colorSection, inline: false },
        { name: '🧸 Items', value: itemSection, inline: false }
      )
      .setFooter({ text: `Use .x enable or .x disable to activate/deactivate roles.` });

    message.reply({
      embeds: [embed],
      allowedMentions: { parse: ['roles'] }
    });
  }
};