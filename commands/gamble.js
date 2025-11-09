import { EmbedBuilder } from 'discord.js';
import {
  getUserBalance,
  addUserXats,
  getLastGamble,
  setLastGamble
} from '../db.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const config = require('../config.json');

const COOLDOWN_HOURS = 6;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;

export default {
  name: 'gamble',
  description: 'Risk it all! Win up to 150 xats or lose up to 500. Once every 6 hours.',

  async execute(message, args, client) {
    const userId = message.author.id;
    const now = Date.now();

    // === INDEPENDENT 6-HOUR COOLDOWN ===
    const lastGamble = getLastGamble(userId);
    const timeLeft = COOLDOWN_MS - (now - lastGamble);

    if (timeLeft > 0) {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff3366')
          .setTitle('Slow Down, Gambler!')
          .setDescription(`Next gamble in **${hours}h ${minutes}m ${seconds}s**`)
        ]
      });
    }

    // === ROLL THE DICE ===
    const win = Math.random() < 0.45; // 45% win chance

    let amount;
    if (win) {
      amount = Math.floor(Math.random() * 101) + 50; // +50 to +150
    } else {
      amount = -(Math.floor(Math.random() * 401) + 100); // -100 to -500
    }

    // === UPDATE BALANCE & COOLDOWN ===
    addUserXats(userId, amount);
    setLastGamble(userId, now); // This is now completely separate from daily!

    const newBalance = getUserBalance(userId);

    const embed = new EmbedBuilder()
      .setColor(win ? '#00ff88' : '#ff0055')
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTitle(win ? 'JACKPOT!' : 'BUSTED!')
      .setDescription(win
        ? `You won **${amount}** ${config.xatEmoji}!`
        : `You lost **${Math.abs(amount)}** ${config.xatEmoji}... RIP wallet.`
      )
      .addFields(
        { name: 'New Balance', value: `${newBalance} ${config.xatEmoji}`, inline: true },
        { name: 'Next Gamble', value: 'In 6 hours', inline: true }
      )
      .setFooter({ text: 'Feeling lucky? Come back in 6 hours!' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};