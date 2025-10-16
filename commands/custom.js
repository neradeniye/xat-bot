// commands/custom.js
import { db } from '../db.js';

export default {
  name: 'custom',
  async execute(message, args, client) {
    const guild = message.guild;
    const userId = message.author.id;
    const member = await guild.members.fetch(userId);

    // Check if user already has a custom role
    const existing = db.prepare('SELECT role_id FROM user_custom_roles WHERE user_id = ?').get(userId);

    // If user types "disable", remove the role
    if (args[0]?.toLowerCase() === 'disable') {
      if (!existing) {
        return message.reply('⚠️ You don’t currently have a custom role to disable.');
      }

      const role = guild.roles.cache.get(existing.role_id) || await guild.roles.fetch(existing.role_id).catch(() => null);
      if (role) {
        await role.delete('User disabled custom role').catch(() => {});
      }

      db.prepare('DELETE FROM user_custom_roles WHERE user_id = ?').run(userId);
      return message.reply('🗑️ Your custom role has been deleted.');
    }

    // Otherwise, handle role creation / rename
    if (args.length < 1) {
      return message.reply('❌ Please provide a name for your custom role.\nExample: `.x custom Pink Pawn` or `.x custom disable` to remove.');
    }

    const roleName = args.join(' ').trim();

    if (roleName.length > 100) {
      return message.reply('❌ Role name must be 100 characters or fewer.');
    }

    // If role already exists, rename it
    if (existing) {
      const role = guild.roles.cache.get(existing.role_id) || await guild.roles.fetch(existing.role_id).catch(() => null);

      if (role) {
        await role.setName(roleName);
        db.prepare('UPDATE user_custom_roles SET role_name = ? WHERE user_id = ?').run(roleName, userId);
        return message.reply(`✏️ Your custom role has been renamed to **${roleName}**.`);
      }
    }

    // Find bot’s highest role
    const botMember = await guild.members.fetch(client.user.id);
    const botRole = botMember.roles.highest;

    // Create role
    const newRole = await guild.roles.create({
      name: roleName,
      mentionable: false,
      reason: `Custom role created by ${message.author.tag}`
    });

    // Position it below the bot’s highest role
    await newRole.setPosition(botRole.position - 1).catch(() => {});

    // Assign to user
    await member.roles.add(newRole).catch(() => {});

    // Save in DB
    db.prepare(`
      INSERT INTO user_custom_roles (user_id, role_id, role_name)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE 
      SET role_id = excluded.role_id, role_name = excluded.role_name
    `).run(userId, newRole.id, roleName);

    return message.reply(`✅ Created and assigned your custom role: **${roleName}**`);
  }
};