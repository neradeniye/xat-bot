export default {
  name: 'say',
  async execute(message, args, client) {
    const text = args.join(' ');

    if (!text) {
      return message.reply('Usage: `.x say <message>`');
    }

    // Only allow admins (recommended for trolling/safety)
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ Only administrators can use this command.');
    }

    const MAIN_CHANNEL_ID = '1502176270518325310'; // your flirt/main channel
    const targetChannel = message.guild.channels.cache.get(MAIN_CHANNEL_ID);

    if (!targetChannel) {
      return message.reply('❌ Could not find the target channel.');
    }

    try {
      await targetChannel.send(text);
      await message.react('✅'); // optional confirmation
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to send message.');
    }
  }
};