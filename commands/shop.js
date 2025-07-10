import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji, colorRolePrice } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'shop',
  execute(message, args) {
    const category = args[0]?.toLowerCase();

    if (!['colors', 'items'].includes(category)) {
      return message.reply(`🛍️ Please specify a category:\n> \`.x shop colors\`\n> \`.x shop items\``);
    }

    const filtered = shopItems.filter(i => i.type === category);
    if (filtered.length === 0) {
      return message.reply(`❌ No ${category} are currently available.`);
    }

    let reply = `🛒 **Available ${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`;

    for (const item of filtered) {
      const price = item.type === 'color' ? colorRolePrice : item.price;
      reply += `• ${item.name} — ${price} ${xatEmoji}\n`;
    }

    message.reply(reply);
  }
};