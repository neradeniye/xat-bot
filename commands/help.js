import { EmbedBuilder } from 'discord.js';

export default {
  name: 'help',
  execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('Bot Commands')
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
            '`x daily` — Earn 100 xats every 12 hours',
            '`x gamble` — Try your luck to earn or lose big every 6 hours',
            '`x slots` — Try your luck to earn or lose 50 xats every 6 hours',
            '`x transfer` — Transfer xats to another user',
            '`x claim` — Claim lootbox. (30 seconds or less.)',
            '`x leaderboard` - Show the top 10 richest users',
            '`x steal` - Steal from a user every 12 hours',
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
          name: '💬 Social',
          value: [
            '`x profile` — Display your profile card in the server',
            '`x setbanner` — Set banner image for profile (booster only)',
            '`x removebanner` — Remove banner image for profile (booster only)',
            '`x status` — Set your status to be displayed on your profile card',
            '`x marry <@user>` — Marry someone you choose from the server',
            '`x divorce` — Divorce who you had married or has married you'
          ].join('\n'),
          inline: false
        },
        {
          name: '🎨 Roles',
          value: [
            '`x enable <name>` — Activate a color or item role',
            '`x disable <name>` — Deactivate a color or item role',
            '`x namecolor <#hexcode>` — Set a custom color **(boosters only)**',
            '`x remove namecolor` — Delete your custom booster color',
            '`x namegrad` — List of name gradients',
            '`x namegrad <name>` — Set name gradient color **(boosters only)**',
            '`x namegrad remove` — Remove current name gradient color',
            '`x emerald` — Shows emerald commands. Must own emerald item',
            '`x custom` — Allows you to assign a custom role + emoji'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: 'Use .x before each command — example .x balance' });

    message.reply({ embeds: [embed] });
  }
};