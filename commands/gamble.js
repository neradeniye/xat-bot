import { EmbedBuilder } from 'discord.js';
import {
  getUserBalance,
  addUserXats,
  getLastDailyClaim,
  setLastDailyClaim
} from '../db.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const config = require('../config.json'); // <-- this works everywhere

const COOLDOWN_HOURS = 6;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

export default {
  name: 'gamble',
  description: 'Risk it all! Win up to 150 xats or lose up to 500. Once every 6 hours.',

  async execute(message, args, client) {
    const userId = message.author.id;
    const now = Date.now();

    // === COOLDOWN CHECK ===
    const lastGamble = getLastDailyClaim(userId) || 0;
    const timeLeft = COOLDOWN_MS - (now - lastGamble);

    if (timeLeft > 0) {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff3366')
          .setTitle('Too Fast!')
          .setDescription(`You can gamble again in **${hours}h ${minutes}m**.`)
        ]
      });
    }

    // === ROLL THE DICE ===
    const win = Math.random() < 0.45; // 45% win chance

    let amount;
    if (win) {
      amount = Math.floor(Math.random() * 101) + 50; // 50–150
    } else {
      amount = -(Math.floor(Math.random() * 401) + 100); // -100 to -500
    }

    // === UPDATE BALANCE ===
    addUserXats(userId, amount);
    setLastDailyClaim(userId, now); // reuse daily_rewards table

    const newBalance = getUserBalance(userId);

    const embed = new EmbedBuilder()
      .setColor(win ? '#00ff00' : '#ff0000')
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTitle(win ? 'JACKPOT!' : 'BUSTED!')
      .setDescription(win
        ? `You won **${amount}** ${config.xatEmoji}!`
        : `You lost **${Math.abs(amount)}** ${config.xatEmoji}... ouch.`
      )
      .addFields(
        { name: 'New Balance', value: `${newBalance} ${config.xatEmoji}`, inline: true }
      )
      .setFooter({ text: 'Next gamble in 6 hours' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};