// commands/slots.js
import { EmbedBuilder } from 'discord.js';
import {
  getUserBalance,
  addUserXats,
  getLastSlots,
  setLastSlots
} from '../db.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const config = require('../config.json');

const COOLDOWN_HOURS = 6;
const COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

const SLOT_EMOJIS = ['🍒', '🍋', '🍉', '⭐', '💎', '🔔', '7️⃣'];

export default {
  name: 'slots',
  description: 'Play slots! 50/50 chance. Win or lose 50 xats. Once every 6 hours.',

  async execute(message) {
    const userId = message.author.id;
    const now = Date.now();

     // === 3-HOUR COOLDOWN ===
    const lastSlots = getLastSlots(userId);
    const timeLeft = COOLDOWN_MS - (now - lastSlots);

    if (timeLeft > 0) {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor('#ff3366')
          .setTitle('⏳ Cooldown Active')
          .setDescription(`You can play slots again in **${hours}h ${minutes}m ${seconds}s**`)
        ]
      });
    }

    // === PLAY SLOTS (50/50) ===
    const win = Math.random() < 0.5; // Exactly 50% chance

    let result;
    if (win) {
      result = {
        amount: 50,
        title: '🎰 JACKPOT!',
        color: '#00ff88',
        text: `You won **50** ${config.xatEmoji}!`
      };
    } else {
      result = {
        amount: -50,
        title: '💸 Better luck next time...',
        color: '#ff0055',
        text: `You lost **50** ${config.xatEmoji}.`
      };
    }

    // Update balance and cooldown
    addUserXats(userId, result.amount);
    setLastSlots(userId, now);

    const newBalance = getUserBalance(userId);

    // Generate slot reels
    const reel1 = SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];
    const reel2 = SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];
    const reel3 = SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];

    const embed = new EmbedBuilder()
      .setColor(result.color)
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTitle(result.title)
      .setDescription(`${reel1} ${reel2} ${reel3}\n\n${result.text}`)
      .addFields(
        { name: 'New Balance', value: `${newBalance} ${config.xatEmoji}`, inline: true },
        { name: 'Next Spin', value: 'In 6 hours', inline: true }
      )
      .setFooter({ text: '50/50 odds • Come back in 6 hours!' })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
};