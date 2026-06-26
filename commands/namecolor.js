import fs from 'fs';
import { EmbedBuilder } from 'discord.js';
import { db } from '../db.js';
import {
  getUserGradient,
  setUserGradient,
  removeUserGradient,
  getUserColorRole,
  removeUserColorRole
} from '../db.js';

const gradients = JSON.parse(fs.readFileSync('./gradients.json', 'utf-8'));

export default {
  name: 'namecolor',
  aliases: ['namegrad', 'grad', 'color'],   // you can add/remove aliases
  async execute(message, args, client) {
    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId);
    const hasBooster = member.premiumSince || member.roles.cache.some(r => r.tags?.premiumSubscriber);

    if (!hasBooster) {
      return message.reply('🚫 This feature is only available to **server boosters**.');
    }

    const input = args[0]?.toLowerCase();

    // ====================== REMOVE ======================
    if (input === 'remove') {
      let removed = false;

      // Remove custom color role
      const colorRecord = getUserColorRole(userId);
      if (colorRecord?.role_id) {
        const role = message.guild.roles.cache.get(colorRecord.role_id);
        if (role) await role.delete().catch(() => {});
        removeUserColorRole(userId);
        removed = true;
      }

      // Remove gradient role
      const gradRecord = getUserGradient(userId);
      if (gradRecord?.role_id) {
        const role = message.guild.roles.cache.get(gradRecord.role_id);
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role);
        }
        removeUserGradient(userId);
        removed = true;
      }

      return message.reply(removed 
        ? '✅ Your custom color / gradient has been removed.' 
        : 'ℹ️ You don\'t have any custom color or gradient active.');
    }

    // ====================== SHOW LIST ======================
    if (!args[0]) {
      const gradientList = Object.entries(gradients)
        .map(([name, roleId]) => {
          const role = message.guild.roles.cache.get(roleId);
          if (role) {
            // Shows role color + name without pinging
            return `• **${name}** — ${role.toString()}`;
          }
          return `• **${name}**`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🌈 Name Color & Gradient Options')
        .setColor(0xff66cc)
        .setDescription(
          '**Custom Color:**\n' +
          '`#hex1` or `#hex1 #hex2`\n\n' +
          '**Available Gradients:**\n' +
          gradientList +
          '\n\n**Usage Examples:**\n' +
          '• `.x namecolor #ff66cc`\n' +
          '• `.x namecolor #ff66cc #00ffff`\n' +
          '• `.x namecolor red`\n' +
          '• `.x namecolor remove`'
        )
        .setFooter({ text: 'Boosters only • One active color or gradient at a time' });

      return message.reply({ 
        embeds: [embed], 
        allowedMentions: { parse: [] }   // ← This prevents any pings
      });
    }

    // ====================== GRADIENT MODE ======================
    if (gradients[input]) {
      const roleId = gradients[input];
      const role = message.guild.roles.cache.get(roleId);

      if (!role) return message.reply('❌ That gradient role no longer exists.');

      // Remove previous gradient if different
      const prev = getUserGradient(userId);
      if (prev?.role_id && prev.role_id !== roleId) {
        const prevRole = message.guild.roles.cache.get(prev.role_id);
        if (prevRole) await member.roles.remove(prevRole).catch(() => {});
      }

      await member.roles.add(role);
      setUserGradient(userId, roleId);

      return message.reply(`✅ Gradient **${role.name}** has been applied!`);
    }

    // ====================== CUSTOM COLOR MODE ======================
    const color1 = args[0]?.toLowerCase();
    const color2 = args[1]?.toLowerCase();

    if (!/^#[0-9a-f]{6}$/.test(color1)) {
      return message.reply('❌ Invalid hex color. Use format like `#ff66cc` or `#ff66cc #00ffaa`.');
    }
    if (color2 && !/^#[0-9a-f]{6}$/.test(color2)) {
      return message.reply('❌ Invalid second hex color.');
    }

    const guild = message.guild;
    let role;

    const existing = db.prepare('SELECT role_id FROM user_custom_colors WHERE user_id = ?').get(userId);

    if (existing) {
      role = guild.roles.cache.get(existing.role_id);
      if (role) {
        await role.setColors({ 
          primaryColor: color1, 
          secondaryColor: color2 || undefined 
        }).catch(() => {});

        db.prepare(`
          UPDATE user_custom_colors 
          SET color1 = ?, color2 = ? 
          WHERE user_id = ?
        `).run(color1, color2 || null, userId);

        return message.reply(`🎨 Updated your custom color to **${color1}${color2 ? ` → ${color2}` : ''}**.`);
      }
    }

    // Create new role
    const botMember = await guild.members.fetch(client.user.id);
    const botRole = botMember.roles.highest;

    role = await guild.roles.create({
      name: `${message.author.username}`,
      colors: { 
        primaryColor: color1, 
        secondaryColor: color2 || undefined 
      },
      mentionable: false,
      reason: 'Booster custom color'
    });

    await role.setPosition(botRole.position - 1);
    await member.roles.add(role);

    db.prepare(`
      INSERT INTO user_custom_colors (user_id, role_id, color1, color2)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE 
      SET role_id = excluded.role_id, color1 = excluded.color1, color2 = excluded.color2
    `).run(userId, role.id, color1, color2 || null);

    return message.reply(`✅ Created custom color role: **${color1}${color2 ? ` → ${color2}` : ''}**`);
  }
};