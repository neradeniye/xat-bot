import { EmbedBuilder } from 'discord.js';
import { getUserBalance, getUserProfile, db } from '../db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Fix config loading for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

const DEFAULT_BANNER = 'https://i.imgur.com/8e1Z3.jpg';
const BANNER_MAP = {
  default: 'https://i.imgur.com/8e1Z3.jpg',
  // vip: 'https://i.imgur.com/vip.jpg',
  // diamond: 'https://i.imgur.com/diamond.jpg'
};

export default {
  name: 'profile',
  description: 'Show your or someone else\'s xat profile',

  async execute(message, args) {
    let target = message.author;
    let member = message.member;

    if (message.mentions.users.size > 0) {
      target = message.mentions.users.first();
      member = message.guild.members.cache.get(target.id)
        || await message.guild.members.fetch(target.id).catch(() => null);
      
      if (!member) return message.reply('User not found in this server.');
    }

    const userId = target.id;
    const balance = getUserBalance(userId);
    const profile = getUserProfile(userId) || { 
      status: 'No status set ~ use .x setstatus', 
      banner: 'default' 
    };

    const ownedItems = db.prepare('SELECT COUNT(*) as count FROM user_items WHERE userId = ?')
      .get(userId)?.count || 0;

    const bannerUrl = BANNER_MAP[profile.banner] || DEFAULT_BANNER;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${target.username}'s Profile`,
        iconURL: target.displayAvatarURL({ dynamic: true, size: 512 })
      })
      .setDescription(`> **"${profile.status}"**`)
      .setImage(bannerUrl)
      .setColor(0x9b59b6)
      .addFields(
        { name: 'Xats', value: `${balance.toLocaleString()} ${config.xatEmoji}`, inline: true },
        { name: 'Items Owned', value: ownedItems.toString(), inline: true },
        { name: 'Rank', value: '#420', inline: true }
      )
      .setFooter({ 
        text: 'Use .x setstatus <text> • Banners coming soon!' 
      })
      .setTimestamp();

    await message.reply({ 
      embeds: [embed],
      allowedMentions: { repliedUser: false }
    });
  }
};