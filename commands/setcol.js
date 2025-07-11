import { db } from '../db.js';
import { getUserColorRole, setUserColorRole, removeUserColorRole } from '../db.js';

export default {
  name: 'setcol',
  async execute(message, args) {
    try {
      const colorCode = args[0]?.toLowerCase();
      const userId = message.author.id;
      const member = await message.guild.members.fetch(userId);

      if (!/^#[0-9a-f]{6}$/.test(colorCode)) {
        return message.reply('❌ Invalid hex color. Use format like `#ff66cc`.');
      }

      const hasBoosterRole = member.premiumSince || member.roles.cache.some(role => role.tags?.premiumSubscriber);

      if (!hasBoosterRole) {
        return message.reply('🚫 This feature is only available to **server boosters**.');
      }

      const guild = message.guild;
      const existing = db.prepare('SELECT role_id FROM user_custom_colors WHERE user_id = ?').get(userId);

      let role;

      if (existing) {
        role = guild.roles.cache.get(existing.role_id) || await guild.roles.fetch(existing.role_id);
        if (role) {
          await role.setColor(colorCode);
          return message.reply(`🎨 Your custom color has been updated to **${colorCode}**.`);
        }
      }

      // Create new role
      role = await guild.roles.create({
        name: `${message.author.username}'s Color`,
        color: colorCode,
        mentionable: false,
        reason: 'Booster custom color'
      });

      // Store in DB
      db.prepare(`
        INSERT INTO user_custom_colors (user_id, role_id)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET role_id = excluded.role_id
      `).run(userId, role.id);

      await member.roles.add(role);

      return message.reply(`✅ Created and assigned your booster color: **${colorCode}**`);
    } catch (err) {
      console.error('[setcol] Error:', err);
      return message.reply('❌ Something went wrong while setting your custom color.');
    }
  }
};