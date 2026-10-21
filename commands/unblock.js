import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { removeSayBlacklist } from '../db.js';

export default {
  name: 'unblock',
  data: new SlashCommandBuilder()
    .setName('unblock')
    .setDescription('Unblock a user from using /say')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to unblock from /say')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const target = interaction.options.getUser('user');
    if (!target) {
      return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    }

    removeSayBlacklist(target.id);
    return interaction.reply({
      content: `✅ ${target} has been unblocked from /say.`,
      ephemeral: true,
    });
  },
};