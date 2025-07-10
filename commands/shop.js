import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji, colorRolePrice } = config;
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'shop',
  execute(message, args) {
    const input = args[0]?.toLowerCase();

    let type = null;
    if (input === 'colors') type = 'color';
    else if (input === 'items') type = 'item';
    else {
      return message.reply(`🛍️ Please specify a category:\n> \`.x shop colors\`\n> \`.x shop items\``);
    }

    const filtered = shopItems.filter(i => i.type === type);

    if (filtered.length === 0) {
      return message.reply(`❌ No ${input} are currently available.`);
    }

    let reply = `🛒 **Available ${input.charAt(0).toUpperCase() + input.slice(1)}:**\n`;

for (const item of filtered) {
  const price = item.type === 'color' ? colorRolePrice : item.price;

  const name = item.type === 'color'
    ? `<@&${item.roleId}>`  // ping role
    : item.name;

  reply += `• ${name} — ${price} ${xatEmoji}\n`;
}

    message.reply(reply);
  }
};