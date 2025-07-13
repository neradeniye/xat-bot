import { db } from '../db.js';
console.log('[DEBUG] DB import check:', typeof db);

export default {
  name: 'namecolor',
  async execute(message, args, client) {
    const input = args[0]?.toLowerCase();
    const userId = message.author.id;
    const guild = message.guild;
    const member = await guild.members.fetch(userId);

    // === REMOVE ===
    if (input === 'remove') {
      const record = db.prepare('SELECT role_id FROM user_custom_colors WHERE user_id = ?').get(userId);
      if (!record) {
        return message.reply('❌ You do not have a namecolor set.');
      }

      const role = guild.roles.cache.get(record.role_id);
      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        return message.reply('🗑️ Your custom namecolor has been removed (still saved).');
      } else {
        return message.reply('ℹ️ You already have no namecolor role assigned.');
      }
    }

    // === RESTORE ===
    if (input === 'restore') {
      const record = db.prepare('SELECT role_id FROM user_custom_colors WHERE user_id = ?').get(userId);
      if (!record) {
        return message.reply('⚠️ No saved namecolor role found to restore.');
      }

      const roleId = record.role_id;
      const oldRole = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);

      if (oldRole) {
        await member.roles.add(oldRole);
        return message.reply('✅ Your custom namecolor has been restored.');
      } else {
        // Create new role fallback if deleted
        const hasBoosterRole = member.premiumSince || member.roles.cache.some(role => role.tags?.premiumSubscriber);
        if (!hasBoosterRole) {
          return message.reply('🚫 Only **server boosters** can restore a custom color.');
        }

        const botMember = await guild.members.fetch(client.user.id);
        const botRole = botMember.roles.highest;

        const restored = await guild.roles.create({
          name: `${message.author.username}`,
          color: '#ff66cc',
          mentionable: false,
          reason: 'Restored booster custom color'
        });

        await restored.setPosition(botRole.position - 1);
        await member.roles.add(restored);

        db.prepare(`UPDATE user_custom_colors SET role_id = ? WHERE user_id = ?`).run(restored.id, userId);

        return message.reply(`✅ Custom namecolor role restored with default color **#ff66cc**.`);
      }
    }

    // === CREATE/UPDATE ===
    const colorCode = input;
    if (!/^#[0-9a-f]{6}$/.test(colorCode)) {
      return message.reply('❌ Invalid hex color. Use format like `#ff66cc`.');
    }

    const hasBoosterRole = member.premiumSince || member.roles.cache.some(role => role.tags?.premiumSubscriber);
    if (!hasBoosterRole) {
      return message.reply('🚫 This feature is only available to **server boosters**.');
    }

    const existing = db.prepare('SELECT role_id FROM user_custom_colors WHERE user_id = ?').get(userId);
    let role;

    if (existing) {
      role = guild.roles.cache.get(existing.role_id) || await guild.roles.fetch(existing.role_id).catch(() => null);
      if (role) {
        await role.setColor(colorCode);
        return message.reply(`🎨 Your custom color has been updated to **${colorCode}**.`);
      }
    }

    const botMember = await guild.members.fetch(client.user.id);
    const botRole = botMember.roles.highest;

    role = await guild.roles.create({
      name: `${message.author.username}`,
      color: colorCode,
      mentionable: false,
      reason: 'Booster custom color'
    });

    await role.setPosition(botRole.position - 1);

    db.prepare(`
      INSERT INTO user_custom_colors (user_id, role_id)
      VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET role_id = excluded.role_id
    `).run(userId, role.id);

    await member.roles.add(role);

    return message.reply(`✅ Created and assigned your booster color: **${colorCode}**`);
  }
};