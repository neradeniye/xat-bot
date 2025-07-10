import fs from 'fs';
import {
  userOwnsItem
} from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const shopItems = JSON.parse(fs.readFileSync('./shop.json', 'utf-8'));

export default {
  name: 'inventory',
  async execute(message) {
    const userId = message.author.id;
    const member = message.guild.members.cache.get(userId) || await message.guild.members.fetch(userId);

    // Group by type
    const ownedColors = shopItems.filter(item =>
      item.type === 'color' && userOwnsItem(userId, item.name)
    );

    const ownedItems = shopItems.filter(item =>
      item.type === 'item' && userOwnsItem(userId, item.name)
    );

    // Determine which ones are currently active (roles assigned)
    const hasRole = (roleId) => member.roles.cache.has(roleId);

    const formatList = (items) =>
      items.length > 0
        ? items.map(i => `${hasRole(i.roleId) ? '🟢' : '⚪'} ${i.name}`).join('\n')
        : 'None';

    const reply = `📦 **Inventory for ${message.author.username}:**

🎨 **Colors:**
${formatList(ownedColors)}

🧸 **Items:**
${formatList(ownedItems)}
`;

    message.reply(reply);
  }
};