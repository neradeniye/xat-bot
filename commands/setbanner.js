// commands/setbanner.js
import { getUserBanner, setUserBanner } from '../db.js';

export default {
  name: 'setbanner',
  async execute(message) {
    // Check if user is boosting
    if (!message.member.premiumSince) {
      return message.reply('❌ Only **server boosters** can set a custom profile banner!');
    }

    if (!message.attachments.size) {
      return message.reply('Please attach an image!\n\n**Recommended dimensions: `900x300`** (will be smart-cropped if different size)');
    }

    const attachment = message.attachments.first();
    if (!attachment.contentType?.startsWith('image/')) {
      return message.reply('That file is not an image!');
    }

    // Optional: warn about very large files
    if (attachment.size > 8_000_000) {
      return message.reply('Image is too big! Max 8MB.');
    }

    setUserBanner(message.author.id, attachment.url);

    await message.reply({
      content: `✅ **Custom banner saved!**\n\n` +
               `It will now appear on your \`.x profile\`.\n` +
               `**Recommended dimensions: \`900x300\`** for best results (but any size works — it gets smart-cropped).`,
      allowedMentions: { repliedUser: false }
    });
  }
};