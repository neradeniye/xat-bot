const shop = require('./shared/shopData');

module.exports = {
  name: 'buy',
  description: 'Purchase a role from the shop.',
  async execute(message, args, db) {
    const itemName = args.join(' ').toLowerCase();
    if (!itemName) return message.reply('Please specify an item or color to buy.');

    const color = shop.colors.find(c => c.name.toLowerCase() === itemName);
    const item = shop.items.find(i => i.name.toLowerCase() === itemName);

    const userId = message.author.id;
    const getUser = db.prepare('SELECT xats FROM users WHERE userId = ?');
    const user = getUser.get(userId) || { xats: 0 };

    let price, roleId;

    if (color) {
      price = shop.colorPrice;
      roleId = color.roleId;
    } else if (item) {
      price = item.price;
      roleId = item.roleId;
    } else {
      return message.reply('That item is not in the shop.');
    }

    if (user.xats < price) {
      return message.reply(`You need ${price} xats to buy **${itemName}**, but you only have ${user.xats}.`);
    }

    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.reply('Role not found on this server.');

    const member = message.guild.members.cache.get(message.author.id);
    if (member.roles.cache.has(roleId)) {
      return message.reply(`You already have the **${itemName}** role.`);
    }

    // Deduct xats and assign role
    db.prepare('UPDATE users SET xats = xats - ? WHERE userId = ?').run(price, userId);
    await member.roles.add(roleId);

    message.reply(`✅ You purchased **${itemName}** for ${price} xats!`);
  }
};