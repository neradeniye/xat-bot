module.exports = {
  name: 'balance',
  description: 'Check your or another user\'s xats.',
  execute(message, args, db) {
    const target = message.mentions.users.first() || message.author;
    const userId = target.id;

    const getUser = db.prepare('SELECT xats FROM users WHERE userId = ?');
    let row = getUser.get(userId);

    if (!row) {
      db.prepare('INSERT INTO users (userId, xats) VALUES (?, ?)').run(userId, 0);
      row = { xats: 0 };
    }

    const emoji = '<:xat:123456789012345678>'; // Replace with your emoji ID
    const name = target.id === message.author.id ? 'You have' : `${target.username} has`;

    message.reply(`${name} ${row.xats} ${emoji} xats.`);
  }
};