// commands/setbanner.js
import { getUserBanner, setUserBanner } from '../db.js';
import { AttachmentBuilder } from 'discord.js';

export default {
  name: 'setbanner',
  async execute(message) {
    // Check if user is boosting
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
      // Download the image and store as base64
      const response = await fetch(attachment.url);
      if (!response.ok) throw new Error('Failed to download');

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');

      setUserBanner(message.author.id, base64, attachment.contentType);

      await message.reply({
        content: `✅ **Custom banner saved permanently!**\n\n` +
                 `It will now appear on your \`.x profile\`.\n` +
                 `**Recommended:** \`900x300\` for best results.`,
        allowedMentions: { repliedUser: false }
      });

    } catch (err) {
      console.error('[SetBanner Error]', err);
      return message.reply('❌ Failed to save banner. Please try again.');
    }
  }
};