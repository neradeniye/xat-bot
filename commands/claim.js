const { addUserXats } = await import('../db.js');

const TROLL_CHANCE = 0.10; // 10% chance to troll
const TROLL_MESSAGES = [
  "I didn't feel generous. Sorry buddy.",
  "You opened the lootbox... it was empty. Tough luck.",
  "The lootbox laughed at you. **0 xats.**",
  "You reached in... and pulled out *nothing*. Classic.",
  "The bot ate the reward. You get **0 xats**."
];

export default {
  name: 'claim',
  async execute(message) {
    if (!global.lootboxActive || global.lootboxClaimed) {
      return message.reply('There is no lootbox to claim right now.');
    }

    const isTrolled = Math.random() < TROLL_CHANCE;
    let reward = 0;
    let response = '';

    if (isTrolled) {
      reward = 0;
      response = TROLL_MESSAGES[Math.floor(Math.random() * TROLL_MESSAGES.length)];
    } else {
      reward = Math.floor(Math.random() * (300 - 50 + 1)) + 50;
      response = `${message.author} has claimed the lootbox and received **${reward} xats**!`;
    }

    // Always mark as claimed (even if trolled)
    global.lootboxClaimed = true;
    global.lootboxActive = false;

    // Only add xats if not trolled
    if (reward > 0) {
      addUserXats(message.author.id, reward);
    }

    return message.channel.send(response);
  }
};