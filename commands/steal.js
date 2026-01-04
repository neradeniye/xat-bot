import { getUserBalance, addUserXats, getLastSteal, setLastSteal } from '../db.js';

export default {
  name: 'steal',
  description: 'Attempt to steal 100-1000 xats from another user (50% chance, 12-hour cooldown). Failure costs you 100-1000 xats.',
  usage: '.x steal @user',

  async execute(message, args) {
    const target = message.mentions.members?.first();
    if (!target) return message.reply('Mention a user to steal from.');
    if (target.user.bot) return message.reply('Cannot steal from bots.');
    if (target.id === message.author.id) return message.reply('Cannot steal from yourself.');

    const now = Date.now();
    const lastSteal = getLastSteal(message.author.id);
    const cooldown = 12 * 60 * 60 * 1000; // 12 hours

    if (now - lastSteal < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastSteal)) / (60 * 60 * 1000));
      return message.reply(`You must wait ${remaining} hours before stealing again.`);
    }

    setLastSteal(message.author.id, now);

    const success = Math.random() >= 0.5;
    const amount = Math.floor(Math.random() * 901) + 100;

    if (success) {
      const targetBal = getUserBalance(target.id);
      const stealAmt = Math.min(amount, targetBal);
      if (stealAmt <= 0) return message.reply(`${target} has no xats to steal.`);

      addUserXats(target.id, -stealAmt);
      addUserXats(message.author.id, stealAmt);
      return message.reply(`Success! You stole **${stealAmt} xats** from ${target}.`);
    } else {
      const thiefBal = getUserBalance(message.author.id);
      const loseAmt = Math.min(amount, thiefBal);
      if (loseAmt <= 0) return message.reply('You have no xats to lose on failure.');

      addUserXats(message.author.id, -loseAmt);
      return message.reply(`Failure! You lost **${loseAmt} xats**. Better luck next time.`);
    }
  }
};