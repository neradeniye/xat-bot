import { db } from '../db.js';
console.log('[DEBUG] DB import check:', typeof db);

export default {
  name: 'namecolor',
  async execute(message, args, client) {
    const color1 = args[0]?.toLowerCase();
    const color2 = args[1]?.toLowerCase();
    const userId = message.author.id;
    const member = await message.guild.members.fetch(userId);

    // Validate first color
    if (!/^#[0-9a-f]{6}$/.test(color1)) {
      return message.reply('❌ Invalid first hex color. Use format like `#ff66cc`.');
    }

    // If second color provided, validate it too
    if (color2 && !/^#[0-9a-f]{6}$/.test(color2)) {
      return message.reply('❌ Invalid second hex color. Use format like `#66ccff`.');
    }

    // Check if user is a booster
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
        await role.setColor(color1, color2); // Discord only supports 1 color
        db.prepare(`
          UPDATE user_custom_colors
          SET role_id = ?, color1 = ?, color2 = ?
          WHERE user_id = ?
        `).run(role.id, color1, color2 || null, userId);

        return message.reply(`🎨 Your custom color has been updated to **${color1}${color2 ? ` → ${color2}` : ''}**.`);
      }
    }

    // Find bot's own role
    const botMember = await guild.members.fetch(client.user.id);
    const botRole = botMember.roles.highest;

    // Create role
    role = await guild.roles.create({
      name: `${message.author.username}`,
      color: color1, color2,// Discord role color = first color
      mentionable: false,
      reason: 'Booster custom color'
    });

    // Move below bot's role
    await role.setPosition(botRole.position - 1);

    // Save in DB
    db.prepare(`
      INSERT INTO user_custom_colors (user_id, role_id, color1, color2)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE 
      SET role_id = excluded.role_id, color1 = excluded.color1, color2 = excluded.color2
    `).run(userId, role.id, color1, color2 || null);

    await member.roles.add(role);

    return message.reply(`✅ Created and assigned your booster color: **${color1}${color2 ? ` → ${color2}` : ''}**`);
  }
};