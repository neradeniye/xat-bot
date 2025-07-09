import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'shop',
  execute(message) {
    let reply = `🛒 **Available Items:**\n`;

    for (const item of shopItems) {
      reply += `• ${item.name} (${item.type}) — ${item.price} ${xatEmoji}\n`;
    }

    message.reply(reply);
  }
};