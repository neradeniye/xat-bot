import { EmbedBuilder } from 'discord.js';

export default {
  name: 'help',
  execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('<:xat:1385788399788621854> Xat-Bot Commands')
      .setColor(0x00bcd4)
      .setDescription('Here are all the available commands, sorted by category:')
      .addFields(
        {
          name: '💰 Economy',
          value: [
            '`x balance` — Check your xats balance',
            '`x balance @user` — View another user\'s balance',
            '`x inventory` — View your owned colors and items',
            '`x earn` — Earns xats automatically by chatting (every 10s)'
          ].join('\n'),
          inline: false
        },
        {
          name: '🛍️ Shop',
          value: [
            '`x shop colors` — View all purchasable color roles',
            '`x shop items` — View all purchasable items',
            '`x buy <name>` — Purchase an item or color'
          ].join('\n'),
          inline: false
        },
        {
          name: '🎨 Roles',
          value: [
            '`x enable <name>` — Activate a color or item role',
            '`x disable <name>` — Deactivate a color or item role',
            '`x setcol <#hex>` — Set a custom color (boosters only)',
            '`x remove custom` — Delete your custom booster color'
          ].join('\n'),
          inline: false
        },
        {
          name: '🛠️ Admin Tools',
          value: [
            '`x cleardata` — Wipes all user balances and ownership',
            '`x add xats|item|color @user <amount/name>` — Grant xats or items',
            '`x remove xats|item|color @user <amount/name>` — Remove xats or items'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Use .x before each command — e.g. .x balance' });

    message.reply({ embeds: [embed] });
  }
};