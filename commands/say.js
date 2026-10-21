import { SlashCommandBuilder } from 'discord.js';

export default {
  name: 'say',
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Send a message as yourself in the main channel')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('What you want to say')
        .setRequired(true)
        .setMaxLength(2000)
    ),

  aliases: [],

  async execute(source, args, client) {
    const isSlash = !!source.isChatInputCommand;

    let text;
    let member;
    let guild;

    if (isSlash) {
      text = source.options.getString('message')?.trim();
      member = source.member;
      guild = source.guild;
    } else {
      text = args.join(' ').trim();
      member = source.member;
      guild = source.guild;
    }

    if (!text) {
      const reply = 'Usage: `/say <message>` or `.x say <message>`';
      return isSlash
        ? source.reply({ content: reply, ephemeral: true })
        : source.reply(reply);
    }

    // Block muted users
    const isMuted = member.roles.cache.some(
      role => role.name.toLowerCase() === 'muted'
    );

    if (isMuted) {
      const reply = '❌ You are muted and cannot use this command.';
      return isSlash
        ? source.reply({ content: reply, ephemeral: true })
        : source.reply(reply);
    }

    const MAIN_CHANNEL_ID = '1530276633561268284';
    const targetChannel = guild.channels.cache.get(MAIN_CHANNEL_ID);

    if (!targetChannel) {
      const reply = '❌ Could not find the target channel.';
      return isSlash
        ? source.reply({ content: reply, ephemeral: true })
        : source.reply(reply);
    }

    try {
      const webhooks = await targetChannel.fetchWebhooks();
      let webhook = webhooks.find(
        wh => wh.name === 'xat-say' && wh.owner?.id === client.user.id
      );

      if (!webhook) {
        webhook = await targetChannel.createWebhook({
          name: 'xat-say',
          avatar: client.user.displayAvatarURL(),
        });
      }

      // Send as the user + small identification
    await webhook.send({
      content: text,                                          // ← just the message, nothing extra
      username: `${member.displayName} (${member.user.username})`,
      avatarURL: member.displayAvatarURL({ dynamic: true, size: 256 }),
      allowedMentions: { parse: [] },
    });

      if (isSlash) {
        await source.reply({ content: '✅ Message sent!', ephemeral: true });
      } else {
        await source.react('✅');
      }
    } catch (err) {
      console.error('[say command]', err);

      const reply =
        '❌ Failed to send message. Make sure the bot has **Manage Webhooks** permission in the target channel.';

      if (isSlash) {
        if (source.replied || source.deferred) {
          await source.followUp({ content: reply, ephemeral: true });
        } else {
          await source.reply({ content: reply, ephemeral: true });
        }
      } else {
        await source.reply(reply);
      }
    }
  },
};