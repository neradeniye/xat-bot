import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { storeSecretMessage } from '../db.js';

export default {
  name: 'secret',
  data: new SlashCommandBuilder()
    .setName('secret')
    .setDescription('Send a secret message (only visible after clicking the button)')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The secret message')
        .setRequired(true)
        .setMaxLength(2000)
    ),

  async execute(source, args, client) {
    const isSlash = !!source.isChatInputCommand;

    let text, member, guild;

    if (isSlash) {
      text = source.options.getString('message')?.trim();
      member = source.member;
      guild = source.guild;
    } else {
      // Optional prefix support (.x secret ...)
      text = args.join(' ').trim();
      member = source.member;
      guild = source.guild;
    }

    if (!text) {
      const reply = 'Usage: `/secret <message>`';
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
      // Store the secret (temporary)
      const secretId = storeSecretMessage(member.id, text);

      // Create the button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`secret_view:${secretId}`)
          .setLabel('View Secret')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔒')
      );

      // Find or create webhook (same as /say)
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

      // Send as the user (exact same style as /say)
      await webhook.send({
        content: '🔒 **Secret message**',
        username: `${member.displayName} (${member.user.username})`,
        avatarURL: member.displayAvatarURL({ dynamic: true, size: 256 }),
        components: [row],
        allowedMentions: { parse: [] },
      });

      if (isSlash) {
        await source.reply({ content: '✅ Secret message sent!', ephemeral: true });
      } else {
        await source.react('✅');
      }
    } catch (err) {
      console.error('[secret command]', err);
      const reply = '❌ Failed to send secret message.';
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