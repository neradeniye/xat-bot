// commands/setbanner.js
import { setUserBanner } from '../db.js';

export default {
  name: 'setbanner',
  async execute(message) {
    if (!message.member.premiumSince) {
      return message.reply('❌ Only **server boosters** can set a custom profile banner!');
    }

    if (!message.attachments.size) {
      return message.reply('Please attach an image!\n\n**Recommended dimensions: `900x300`**');
    }

    const attachment = message.attachments.first();
    if (!attachment.contentType?.startsWith('image/')) {
      return message.reply('That file is not an image!');
    }

    if (attachment.size > 8_000_000) {
      return message.reply('Image is too big! Max 8MB.');
    }

    try {
      console.log(`[SetBanner] Attempting to save banner for ${message.author.tag}`);

      const response = await fetch(attachment.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');

      console.log(`[SetBanner] Image downloaded (${buffer.length} bytes)`);

      setUserBanner(message.author.id, base64, attachment.contentType || 'image/png');

      console.log(`[SetBanner] Successfully saved for ${message.author.tag}`);

      await message.reply({
        content: `✅ **Custom banner saved permanently!**\n\nIt will now appear on your \`.x profile\`.`,
        allowedMentions: { repliedUser: false }
      });

    } catch (err) {
      console.error('[SetBanner ERROR]', err);
      await message.reply(`❌ Failed to save banner: ${err.message || 'Unknown error'}. Please try again.`);
    }
  }
};