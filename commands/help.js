import { EmbedBuilder } from 'discord.js';

export default {
  name: 'help',
  execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('<:xat:1385788399788621854> Bot Commands')
      .setColor(0x00bcd4)
      .setDescription('Here are all the available commands, sorted by category:')
      .setThumbnail("https://cdn.discordapp.com/attachments/1367355602459951124/1393698040166092861/xat_embed_thumb.png?ex=68741df2&is=6872cc72&hm=3913c8dcea30099c45b73e18d868670ef88b924e5831e480fc831f26ac8582a3&")
      .addFields(
        {
          name: '💰 Economy',
          value: [
            '`x balance` — Check your current xats balance',
            '`x balance @user` — View another user\'s xats balance',
            '`x inventory` — View your owned colors and items',
            '`x daily` — Earn 100 xats every 12 hours'
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
            '`x namecolor <#hex>` — Set a custom color (boosters only)',
            '`x remove namecolor` — Delete your custom booster color'
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