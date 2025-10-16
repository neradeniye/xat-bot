// commands/custom.js
import { db } from '../db.js';

export default {
  name: 'custom',
  async execute(message, args, client) {
    const guild = message.guild;
    const userId = message.author.id;
    const member = await guild.members.fetch(userId);

    // Make sure a name was provided
    if (args.length < 1) {
      return message.reply('❌ Please provide a name for your custom role.\nExample: `.x custom Pink Pawn`');
    }

    // Combine all args as the role name
    const roleName = args.join(' ').trim();

    // Validate name length
    if (roleName.length > 100) {
      return message.reply('❌ Role name must be 100 characters or fewer.');
    }

    // Check if user already has a custom role
    const existing = db.prepare('SELECT role_id FROM user_custom_roles WHERE user_id = ?').get(userId);
    let role;

    // If they already have a role, update it
    if (existing) {
      role = guild.roles.cache.get(existing.role_id) || await guild.roles.fetch(existing.role_id).catch(() => null);

      if (role) {
        await role.setName(roleName);
        db.prepare('UPDATE user_custom_roles SET role_name = ? WHERE user_id = ?').run(roleName, userId);
        return message.reply(`✏️ Your custom role name has been updated to **${roleName}**.`);
      }
    }

    // Find bot’s highest role to position the new role correctly
    const botMember = await guild.members.fetch(client.user.id);
    const botRole = botMember.roles.highest;

    // Create a new role
    role = await guild.roles.create({
      name: roleName,
      mentionable: false,
      reason: `Custom role created by ${message.author.tag}`
    });

    // Move the role below the bot’s highest role
    await role.setPosition(botRole.position - 1).catch(() => {});

    // Assign role to user
    await member.roles.add(role).catch(() => {});

    // Save in database
    db.prepare(`
      INSERT INTO user_custom_roles (user_id, role_id, role_name)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET role_id = excluded.role_id, role_name = excluded.role_name
    `).run(userId, role.id, roleName);

    return message.reply(`✅ Created and assigned your custom role: **${roleName}**`);
  }
};