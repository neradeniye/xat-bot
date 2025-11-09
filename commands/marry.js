// commands/marry.js
import { getUserBalance, addUserXats, marry, getSpouse } from '../db.js';

export default {
  name: 'marry',
  async execute(message, args) {
    if (!message.mentions.users.size) {
      return message.reply('Tag someone to marry! `.x marry @user`');
    }

    const spouse = message.mentions.users.first();
    if (spouse.id === message.author.id) {
      return message.reply('You can’t marry yourself, silly!');
    }
    if (spouse.bot) {
      return message.reply('Bots don’t believe in love... yet.');
    }

    const currentSpouse = getSpouse(message.author.id);
    if (currentSpouse) {
      return message.reply(`You're already married to <@${currentSpouse}>! Use \`.x divorce\` first.`);
    }

    const spouseCurrent = getSpouse(spouse.id);
    if (spouseCurrent) {
      return message.reply(`They're already married to someone else!`);
    }

    const balance = getUserBalance(message.author.id);
    if (balance < 1000) {
      return message.reply(`Marriage costs **1,000 xats**! You only have **${balance}**.`);
    }

    // DEDUCT XATS
    addUserXats(message.author.id, -1000);

    // MARRY
    marry(message.author.id, spouse.id);

    await message.reply({
      content: `
**WEDDING BELLS!**
**${message.author.username}** just married **${spouse.username}** for **1,000 xats**!
Now update your status: \`.x setstatus Married to @${spouse.username}\`
      `.trim()
    });
  }
};