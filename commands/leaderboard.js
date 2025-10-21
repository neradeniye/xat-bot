// commands/leaderboard.js
import { db } from '../db.js';
import { EmbedBuilder } from 'discord.js';

export default {
  name: 'leaderboard',
  description: 'Shows the top 5 richest users in the server.',
  async execute(message) {
    try {
      // Fetch top 5 users by balance
      const topUsers = db
        .prepare('SELECT id, balance FROM users ORDER BY balance DESC LIMIT 10')
        .all();

      if (topUsers.length === 0) {
        return message.reply("No users found in the leaderboard yet!");
      }

      let leaderboardText = '';
      for (let i = 0; i < topUsers.length; i++) {
        const { id, balance } = topUsers[i];
        const user = await message.client.users.fetch(id).catch(() => null);
        const username = user ? user.username : 'Unknown User';
        leaderboardText += `**${i + 1}. ${username}** — 💰 ${balance.toLocaleString()} xats\n`;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Top 10 Richest Users')
        .setDescription(leaderboardText)
        .setColor(0x00AE86)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[leaderboard.js]', error);
      message.reply('There was an error fetching the leaderboard.');
    }
  },
};