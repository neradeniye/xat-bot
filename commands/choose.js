// commands/choose.js
import { addUserXats } from '../db.js';

let currentImposter = null; // { answer: 'B', rewardGiven: false }

export function setCurrentImposter(data) {
  currentImposter = data;
}

export function getCurrentImposter() {
  return currentImposter;
}

export default {
  name: 'choose',
  async execute(message, args) {
    if (!currentImposter) {
      return message.reply('There is no active Imposter event right now.');
    }

    const choice = args[0]?.toUpperCase();
    if (!['A','B','C','D','E'].includes(choice)) {
      return message.reply('Please choose A, B, C, D, or E.');
    }

    if (currentImposter.rewardGiven) {
      return message.reply('This Imposter round has already ended.');
    }

    const isCorrect = choice === currentImposter.answer;

    if (isCorrect) {
      currentImposter.rewardGiven = true;
      addUserXats(message.author.id, 100);

      await message.reply({
        content: `🎉 **CORRECT!** ${message.author} caught the Imposter!\nYou won **100 xats**!`
      });
    } else {
      addUserXats(message.author.id, -100);
      await message.reply({
        content: `❌ Wrong choice... You lost **100 xats**.`
      });
    }
  }
};