const { removeCommandBan } = await import('../db.js');

export default {
  name: 'unban',
  description: 'Removes the 48-hour command ban (owner only)',
  usage: '.x unban @user',

  async execute(message, args) {
    // ←←←←← PUT YOUR DISCORD USER ID HERE ←←←←←
    const OWNER_ID = '945155519247699968'; // e.g. '123456789012345678'

    if (message.author.id !== OWNER_ID) {
      return message.reply("Only the server owner can use this command.");
    }

    const target = message.mentions.members?.first() || message.guild?.members.cache.get(args[0]);

    if (!target) {
      return message.reply("Mention someone or give their ID.\nExample: `.x unban @Flaky` or `.x unban 123456789012345678`");
    }

    removeCommandBan(target.id);

    message.reply(`Punishment lifted. ${target} can use the bot again.`);
  }
};