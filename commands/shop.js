import fs from 'fs';
import { EmbedBuilder } from 'discord.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji, colorRolePrice } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'shop',
  execute(message, args) {
    const input = args[0]?.toLowerCase();

    let type = null;
    if (input === 'colors') type = 'color';
    else if (input === 'items') type = 'item';
    else {
      return message.reply(`🛍️ Please specify a category:\n> \`.x shop colors\`\n> \`.x shop items\``);
    }

    const filtered = shopItems.filter(i => i.type === type);
    if (filtered.length === 0) {
      return message.reply(`❌ No ${input} are currently available.`);
    }

    let description = '';
for (const item of filtered) {
  const price = item.type === 'color' ? colorRolePrice : item.price;
  const display = item.type === 'color'
    ? `<@&${item.roleId}>`
    : item.name;

  description += `• ${display} — ${price} ${xatEmoji}\n`;
}

const embed = new EmbedBuilder()
  .setTitle(`🛒 ${input.charAt(0).toUpperCase() + input.slice(1)} Shop`)
  .setColor(type === 'color' ? 0xff66cc : 0x66ccff)
  .setDescription(description)
  .setFooter({ text: 'Use .x buy <name> to purchase.' });

    for (const item of filtered) {
      const price = item.type === 'color' ? colorRolePrice : item.price;
      const roleDisplay = item.type === 'color' ? `<@&${item.roleId}>` : item.name;

      embed.addFields({
  name: item.type === 'color' ? `<@&${item.roleId}>` : item.name,
  value: `${price} ${xatEmoji}`,
  inline: true
});
    }

message.reply({
  embeds: [embed],
  allowedMentions: { parse: ['roles'] }
});
  }
};