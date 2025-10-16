// commands/custom.js
import { db } from '../db.js';
import { Buffer } from 'buffer';

export default {
  name: 'custom',
  async execute(message, args, client) {
    const guild = message.guild;
    const userId = message.author.id;
    const member = await guild.members.fetch(userId);

    // ✅ Check if user owns the "Custom" item
    const ownsCustomItem = db
      .prepare('SELECT COUNT(*) AS count FROM inventory WHERE user_id = ? AND item_name = ?')
      .get(userId, 'Custom').count > 0;

    if (!ownsCustomItem) {
      return message.reply('🚫 You must own the **Custom** item to use this command.');
    }

    // Check for existing record
    const existing = db.prepare('SELECT role_id, role_emoji FROM user_custom_roles WHERE user_id = ?').get(userId);

    // If user typed "disable"
    if (args[0]?.toLowerCase() === 'disable') {
      if (!existing) return message.reply('⚠️ You don’t currently have a custom role to disable.');

      const role = guild.roles.cache.get(existing.role_id) || await guild.roles.fetch(existing.role_id).catch(() => null);
      if (role) await role.delete('User disabled custom role').catch(() => {});
      db.prepare('DELETE FROM user_custom_roles WHERE user_id = ?').run(userId);

      return message.reply('🗑️ Your custom role has been deleted.');
    }

    // Must include at least a name
    if (args.length < 1) {
      return message.reply('❌ Please provide a name for your custom role.\nExample: `.x custom Pink Pawn 💖` or `.x custom disable` to remove.');
    }

    // Parse role name and optional emoji/url
    const lastArg = args[args.length - 1];
    let emojiArg = null;
    let roleNameParts = [...args];

    const isUrl = /^(https?:\/\/)/i.test(lastArg);
    const isUnicodeEmoji = /[^\u0000-\u007F]/.test(lastArg);
    const customEmojiMatch = lastArg.match(/^<a?:\w+:(\d+)>$/);

    if (isUrl || isUnicodeEmoji || customEmojiMatch) {
      emojiArg = lastArg;
      roleNameParts = args.slice(0, -1);
    }

    const roleName = roleNameParts.join(' ').trim();
    if (!roleName) return message.reply('❌ Please include a valid role name.');
    if (roleName.length > 100) {
      return message.reply('❌ Role name must be 100 characters or fewer.');
    }

    // Fetch existing role if present
    let role = null;
    if (existing) {
      role = guild.roles.cache.get(existing.role_id) || await guild.roles.fetch(existing.role_id).catch(() => null);
    }

    // If the role exists, update its name and emoji/icon
    if (role) {
      const updateData = { name: roleName };
      let newEmoji = emojiArg || existing.role_emoji;

      if (emojiArg && isUnicodeEmoji) {
        updateData.name = `${emojiArg} ${roleName}`.slice(0, 100);
      } else if (emojiArg && isUrl) {
        try {
          const res = await fetch(emojiArg);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = Buffer.from(await res.arrayBuffer());

          if (buffer.length > 256 * 1024) {
            return message.reply('⚠️ Image too large (max 256KB). Use a smaller image.');
          }

          updateData.icon = buffer;
        } catch (err) {
          console.error('Failed to fetch image:', err);
          return message.reply('❌ Could not download image. Make sure it’s a direct link (PNG/JPG/WebP).');
        }
      }

      await role.edit(updateData).catch(() => {});
      db.prepare('UPDATE user_custom_roles SET role_name = ?, role_emoji = ? WHERE user_id = ?')
        .run(roleName, newEmoji || null, userId);

      return message.reply(`✏️ Your custom role has been updated to **${roleName}**${emojiArg ? ' with new emoji/icon.' : '.'}`);
    }

    // Otherwise, create a new role
    const botMember = await guild.members.fetch(client.user.id);
    const botRole = botMember.roles.highest;

    const roleData = {
      name: roleName,
      mentionable: false,
      reason: `Custom role created by ${message.author.tag}`
    };

    let savedEmoji = emojiArg || null;

    if (emojiArg && isUnicodeEmoji) {
      roleData.name = `${emojiArg} ${roleName}`.slice(0, 100);
    }

    if (emojiArg && isUrl) {
      try {
        const res = await fetch(emojiArg);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());

        if (buffer.length > 256 * 1024) {
          return message.reply('⚠️ Image too large (max 256KB). Use a smaller image.');
        }

        roleData.icon = buffer;
      } catch (err) {
        console.error('Failed to fetch image:', err);
        return message.reply('❌ Could not download image. Make sure it’s a direct link (PNG/JPG/WebP).');
      }
    }

    role = await guild.roles.create(roleData);
    await role.setPosition(botRole.position - 1).catch(() => {});
    await member.roles.add(role).catch(() => {});

    db.prepare(`
      INSERT INTO user_custom_roles (user_id, role_id, role_name, role_emoji)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE
      SET role_id = excluded.role_id, role_name = excluded.role_name, role_emoji = excluded.role_emoji
    `).run(userId, role.id, roleName, savedEmoji);

    return message.reply(`✅ Created and assigned your custom role: **${role.name}**`);
  }
};