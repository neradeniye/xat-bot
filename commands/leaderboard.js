// commands/leaderboard.js
import Database from 'better-sqlite3';
import { EmbedBuilder } from 'discord.js';

const db = new Database('economy.db');

export default {
  name: 'leaderboard',
  description: 'Shows the top 5 richest users in the server.',
  async execute(message) {
    try {
      const guildId = message.guild?.id ?? null;

      // Inspect table schema to see if there's a guild_id column
      const schema = db.prepare("PRAGMA table_info('users')").all();
      const hasGuildId = schema.some(col => col.name === 'guild_id');

      // Build query that orders by numeric value even when stored as text like "3,163"
      // We strip commas then cast to integer for ordering.
      let stmt;
      if (hasGuildId && guildId) {
        stmt = db.prepare(
          `SELECT id, balance
           FROM users
           WHERE guild_id = ?
           ORDER BY CAST(REPLACE(COALESCE(balance, '0'), ',', '') AS INTEGER) DESC
           LIMIT 5`
        );
      } else {
        stmt = db.prepare(
          `SELECT id, balance
           FROM users
           ORDER BY CAST(REPLACE(COALESCE(balance, '0'), ',', '') AS INTEGER) DESC
           LIMIT 5`
        );
      }

      const topUsers = hasGuildId && guildId ? stmt.all(guildId) : stmt.all();

      if (!topUsers || topUsers.length === 0) {
        return message.reply("No users found in the leaderboard yet!");
      }

      // Build leaderboard text and fetch usernames
      let leaderboardText = '';
      for (let i = 0; i < topUsers.length; i++) {
        const row = topUsers[i];
        // Normalize balance to a number for display
        const raw = (row.balance === null || row.balance === undefined) ? '0' : String(row.balance);
        const cleaned = raw.replace(/[^0-9\-]/g, ''); // remove commas and non-digits (keeps minus sign)
        const numericBalance = parseInt(cleaned || '0', 10);

        const user = await message.client.users.fetch(row.id).catch(() => null);
        const mention = user ? `${user.username}#${user.discriminator}` : `Unknown (${row.id})`;

        leaderboardText += `**${i + 1}. ${mention}** — 💰 ${numericBalance.toLocaleString()} xats\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Top 5 Richest Users')
        .setDescription(leaderboardText)
        .setColor(0x00AE86)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Leaderboard error:', error);
      message.reply('There was an error fetching the leaderboard. Check console for details.');
    }
  },
};