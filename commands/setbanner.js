// commands/setbanner.js
import { getUserBanner, setUserBanner } from '../db.js';

export default {
  name: 'setbanner',
  async execute(message, args) {
    // Check if user is boosting
    if (!message.member.premiumSince) {
      return message.reply('❌ Only **server boosters** can set a custom profile banner!');
    }

    if (!message.attachments.size) {
      return message.reply('Please attach an image! `.x setbanner` + image');
    }

    const attachment = message.attachments.first();
    if (!attachment.contentType?.startsWith('image/')) {
      return message.reply('That file is not an image!');
    }

    // Optional: limit file size
    if (attachment.size > 8_000_000) { // 8MB
      return message.reply('Image too big! Max 8MB.');
    }

    setUserBanner(message.author.id, attachment.url);

    await message.reply({
      content: '✅ **Custom banner saved!** It will now appear on your `.x profile`.\nYou can change it anytime by uploading a new image.',
      allowedMentions: { repliedUser: false }
    });
  }
};