import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji, colorRolePrice } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'shop',
  execute(message) {
    let reply = `🛒 **Available Items:**\n`;

    for (const item of shopItems) {
      const price = item.type === 'color' ? colorRolePrice : item.price;
      reply += `• ${item.name} (${item.type}) — ${price} ${xatEmoji}\n`;
    }

    message.reply(reply);
  }
};