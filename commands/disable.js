import fs from 'fs';

const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'disable',
  async execute(message, args) {
    const requestedItem = args.join(' ').toLowerCase();
    if (!requestedItem) return message.reply(`🛠️ Please specify the item you want to disable.`);

    const item = shopItems.find(i =>
      i.type === 'item' &&
      i.name.toLowerCase() === requestedItem
    );

    if (!item) {
      return message.reply(`❌ That item doesn't exist.`);
    }

    const member = message.guild.members.cache.get(message.author.id) ||
                   await message.guild.members.fetch(message.author.id);

    try {
      await member.roles.remove(item.roleId);
      return message.reply(`✅ Item **${item.name}** has been disabled.`);
    } catch (err) {
      console.error('[disable] item role error:', err);
      return message.reply(`❌ Failed to disable item.`);
    }
  }
};