import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getUserBalance, getUserProfile } from '../db.js';
import fs from 'fs';

const DEFAULT_BANNER = 'https://i.imgur.com/8e1Z3.jpg'; // <- replace with your own later
const BANNER_MAP = {
  default: 'https://i.imgur.com/8e1Z3.jpg',
  // we'll add premium ones later like: vip: 'https://i.imgur.com/premium.jpg'
};

export default {
  name: 'profile',
  description: 'Show your or someone else\'s xat profile',

  async execute(message, args) {
    let target = message.author;
    let member = message.member;

    if (message.mentions.users.size > 0) {
      target = message.mentions.users.first();
      member = message.guild.members.cache.get(target.id);
    }

    const userId = target.id;
    const balance = getUserBalance(userId);
    const profile = getUserProfile(userId) || { status: 'No status set ~ use .x setstatus', banner: 'default' };

    // Count owned items
    const ownedItems = db.prepare('SELECT COUNT(*) as count FROM user_items WHERE userId = ?').get(userId)?.count || 0;

    const bannerUrl = BANNER_MAP[profile.banner] || DEFAULT_BANNER;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${target.username}'s Profile`,
        iconURL: target.displayAvatarURL({ dynamic: true, size: 512 })
      })
      .setDescription(`**"${profile.status}"**`)
      .setImage(bannerUrl)
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Xats', value: `${balance.toLocaleString()} ${config.xatEmoji}`, inline: true },
        { name: 'Items Owned', value: ownedItems.toString(), inline: true },
        { name: 'Rank', value: '#420', inline: true } // placeholder — we’ll make real leaderboard later
      )
      .setFooter({ text: 'Use .x setstatus <text> to flex • Banners coming soon!' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};