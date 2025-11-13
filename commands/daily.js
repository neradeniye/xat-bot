import { getLastDailyClaim, setLastDailyClaim, getUserBalance, addUserXats } from '../db.js';

const DAILY_REWARD = 100;
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours
const CURSE_CHANCE = 0.10; // 10% chance to lose xats

export default {
  name: 'daily',
  async execute(message) {
    const userId = message.author.id;
    const now = Date.now();
    const lastClaim = getLastDailyClaim(userId);
    const timePassed = now - lastClaim;

    // Cooldown check
    if (timePassed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - timePassed;
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      return message.reply(`You already claimed today. Try again in **${hours}h ${minutes}m**.`);
    }

    const currentBalance = getUserBalance(userId);
    const isCursed = Math.random() < CURSE_CHANCE;

    let amount = DAILY_REWARD;
    let response = '';

    if (isCursed && currentBalance >= DAILY_REWARD) {
      amount = -DAILY_REWARD;
      response = [
        `Nah. Screw you. I’m taking **100** xats.`,
        `You thought you’d get free stuff? *Wrong.* -100 xats.`,
        `The bot is not in a giving mood. **-100 xats.**`,
        `You pestered me. Now pay. **-100 xats.**`,
        `I rolled a 1. You lose. **-100 xats.**`
      ][Math.floor(Math.random() * 5)];
    } else {
      response = `You received your daily **${DAILY_REWARD}** xats!`;
    }

    // Apply reward/penalty
    addUserXats(userId, amount);
    setLastDailyClaim(userId, now);

    // Final message
    return message.reply(response);
  }
};