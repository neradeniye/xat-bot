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

    const emoji = '<:xats:1387149871987036260>'; // Replace with your emoji ID
    const name = target.id === message.author.id ? '1 You currently have' : `${target.username} currently has`;

    message.reply(`${name} ${row.xats} ${emoji} xats.`);
  }
};