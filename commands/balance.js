const db = require('./db');
const { xatEmoji } = require('./config.json');

module.exports = {
  name: 'balance',
  run(message) {
    const balance = db.getBalance(message.author.id);
    message.reply(`You have ${xatEmoji} ${balance} xats.`);
  }
};