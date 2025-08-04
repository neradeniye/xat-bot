import fs from 'fs';
import { userOwnsItem } from '../db.js';
import { EmbedBuilder } from 'discord.js';

// Load shop & emerald roles from JSON
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));
const emeraldRoles = JSON.parse(fs.readFileSync('./emerald_roles.json', 'utf-8'));

// Find Emerald Pawn item
const emeraldPawn = shopItems.find(
  item => item.name.toLowerCase() === 'emerald pawn'
);

export default {
  name: 'emerald',
  async execute(message) {
    const userId = message.author.id;

    if (!emeraldPawn || !emeraldPawn.roleId) {
      return message.reply('⚠️ Emerald Pawn item is missing or misconfigured in `shop.json`.');
    }

    if (!userOwnsItem(userId, emeraldPawn.name)) {
      return message.reply('🚫 You must own the **Emerald Pawn** item from the shop to use this command.');
    }

    // Build embed
    let description = '';
for (const role of emeraldRoles) {
  const emoji = role.emoji ?? '';
  description += `• ${emoji} **${role.name}** — \`.x emerald ${role.name.toLowerCase()}\`\n`;
}

    const embed = new EmbedBuilder()
      .setTitle('💚 Emerald Roles')
      .setColor(0x50c878)
      .setDescription(description)
      .setFooter({ text: 'Use .x emerald <name> to equip one.' });

    message.reply({
      embeds: [embed],
      allowedMentions: { parse: ['roles'] }
    });
  }
};