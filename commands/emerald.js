import fs from 'fs';
import { userOwnsItem, isItemEnabled } from '../db.js';
import { EmbedBuilder } from 'discord.js';

const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));
const emeraldRoles = JSON.parse(fs.readFileSync('./emerald_roles.json', 'utf-8'));

const emeraldPawn = shopItems.find(i => i.name.toLowerCase() === 'emerald pawn');

export default {
  name: 'emerald',
  async execute(message, args) {
    const userId = message.author.id;
    const member = message.member;

    if (!emeraldPawn || !emeraldPawn.name) {
      return message.reply('⚠️ Emerald Pawn item is not defined correctly in `shop.json`.');
    }

    // Check that user owns the Emerald Pawn
    if (!userOwnsItem(userId, emeraldPawn.name)) {
      return message.reply('🚫 You must own the **Emerald Pawn** item from the shop to use this command.');
    }

    // Check if another pawn is enabled (conflict)
    const otherPawnEnabled = shopItems.find(i =>
      i.name !== emeraldPawn.name &&
      i.name.toLowerCase().includes('pawn') &&
      isItemEnabled(userId, i.name)
    );

    if (otherPawnEnabled) {
      // Remove emerald roles if any
      for (const role of emeraldRoles) {
        const r = message.guild.roles.cache.get(role.roleId);
        if (r && member.roles.cache.has(r.id)) {
          await member.roles.remove(r).catch(() => {});
        }
      }

      return message.reply(`🚫 You currently have **${otherPawnEnabled.name}** enabled. You must disable it before using Emerald roles.`);
    }

    // Check that Emerald Pawn is enabled
    if (!isItemEnabled(userId, emeraldPawn.name)) {
      return message.reply('⚠️ You must enable **Emerald Pawn** first using `.x enable emerald pawn`.');
    }

    // No args = show list
    if (!args.length) {
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

      return message.reply({
        embeds: [embed],
        allowedMentions: { parse: ['roles'] }
      });
    }

    // Parse and validate selected role
    const input = args[0].toLowerCase();
    const selected = emeraldRoles.find(r => r.name.toLowerCase() === input);

    if (!selected) {
      return message.reply('❌ Invalid emerald role name. Use `.x emerald` to view the available options.');
    }

    const newRole = message.guild.roles.cache.get(selected.roleId);
    if (!newRole) {
      return message.reply('⚠️ That emerald role could not be found on the server.');
    }

    // Remove any other emerald roles from the user
    for (const role of emeraldRoles) {
      const r = message.guild.roles.cache.get(role.roleId);
      if (r && member.roles.cache.has(r.id)) {
        await member.roles.remove(r).catch(() => {});
      }
    }

    // Add selected emerald role
    await member.roles.add(newRole).catch(() => {});
    return message.reply(`✅ You have equipped the **${selected.name}** emerald role.`);
  }
};