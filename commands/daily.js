import { getLastDailyClaim, setLastDailyClaim, addUserXats } from '../db.js';

const DAILY_REWARD = 100;
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export default {
  name: 'daily',
  async execute(message) {
    const userId = message.author.id;
    const now = Date.now();
    const lastClaim = getLastDailyClaim(userId);

    const timePassed = now - lastClaim;

    if (timePassed < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - timePassed;
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return message.reply(`⏳ You already claimed your daily xats. Come back in **${hours}h ${minutes}m**.`);
    }

    // Grant reward
    addUserXats(userId, DAILY_REWARD);
    setLastDailyClaim(userId, now);

    return message.reply(`🎁 You received your daily **${DAILY_REWARD}** xats!`);
  }
};