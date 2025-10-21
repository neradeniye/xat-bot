// commands/leaderboard.js
import Database from 'better-sqlite3';
import { EmbedBuilder } from 'discord.js';

const db = new Database('economy.db');

export default {
  name: 'leaderboard',
  description: 'Shows the top 5 richest users in the server.',
  async execute(message) {
    try {
      // Fetch top 5 users by balance
      const topUsers = db
        .prepare('SELECT id, balance FROM users ORDER BY balance DESC LIMIT 5')
        .all();

      if (topUsers.length === 0) {
        return message.reply("No users found in the leaderboard yet!");
      }

      // Build leaderboard string
      let leaderboardText = '';
      for (let i = 0; i < topUsers.length; i++) {
        const user = await message.client.users.fetch(topUsers[i].id).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        leaderboardText += `**${i + 1}. ${username}** — 💰 ${topUsers[i].balance.toLocaleString()} xats\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Top 5 Richest Users')
        .setDescription(leaderboardText)
        .setColor(0x00AE86)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      message.reply('There was an error fetching the leaderboard.');
    }
  },
};