import fs from 'fs';

const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'disable',
  async execute(message, args) {
    const input = args.join(' ').toLowerCase();
    if (!input) return message.reply(`Please specify the item or color you want to disable.`);

    const item = shopItems.find(i => i.name.toLowerCase() === input);
    if (!item) return message.reply(`❌ That item or color doesn't exist.`);

    const member = message.guild.members.cache.get(message.author.id) ||
                   await message.guild.members.fetch(message.author.id);

    try {
      await member.roles.remove(item.roleId);
      return message.reply(`✅ **${item.name}** has been disabled.`);
    } catch (err) {
      console.error('[disable] error:', err);
      return message.reply(`❌ Failed to disable **${item.name}**.`);
    }
  }
};
