const { addUserXats } = await import('../db.js');

export default {
  name: 'claim',
  async execute(message) {
    if (!global.lootboxActive || global.lootboxClaimed) {
      return message.reply('❌ There is no lootbox to claim right now.');
    }

    const reward = Math.floor(Math.random() * (200 - 50 + 1)) + 50;

    global.lootboxClaimed = true;
    global.lootboxActive = false;

    addUserXats(message.author.id, reward);

    return message.channel.send(`🎉 ${message.author} has claimed the lootbox and received **${reward} xats**!`);
  }
};