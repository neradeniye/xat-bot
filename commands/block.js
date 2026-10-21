import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { addSayBlacklist } from '../db.js';

export default {
  name: 'block',
  data: new SlashCommandBuilder()
    .setName('block')
    .setDescription('Block a user from using /say')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to block from /say')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const target = interaction.options.getUser('user');
    if (!target) {
      return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    }

    addSayBlacklist(target.id);
    return interaction.reply({
      content: `✅ ${target} has been blocked from using /say.`,
      ephemeral: true,
    });
  },
};