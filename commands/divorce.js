// commands/divorce.js
import { getSpouse, divorce } from '../db.js';

export default {
  name: 'divorce',
  async execute(message) {
    const spouseId = getSpouse(message.author.id);
    if (!spouseId) {
      return message.reply('You’re not married! Go find love first.');
    }

    const spouse = await message.client.users.fetch(spouseId);

    divorce(message.author.id);

    await message.reply({
      content: `
**DIVORCE FINALIZED**
**${message.author.username}** is now single again.
<@${spouseId}> has been notified (not really, but they’ll see it on their profile)
      `.trim()
    });
  }
};