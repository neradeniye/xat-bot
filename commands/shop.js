const shop = require('../shared/shopData');

module.exports = {
  name: 'shop',
  description: 'View available shop items.',
  execute(message) {
    const colorList = shop.colors
      .map(c => `🎨 ${c.name} — ${shop.colorPrice} xats`)
      .join('\n');

    const itemList = shop.items
      .map(i => `📦 ${i.name} — ${i.price} xats`)
      .join('\n');

    const response = `🛍️ **SHOP**\n\n` +
      `**Colors** (each ${shop.colorPrice} xats):\n${colorList}\n\n` +
      `**Items:**\n${itemList}`;

    message.channel.send(response);
  }
};