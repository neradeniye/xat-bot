// commands/profile.js — GRADIENT GLOW BORDER FOR VIPs
import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import { getUserBalance, getUserProfile, db, getSpouse } from '../db.js';
import { fileURLToPath } from 'url';
import path from 'path';

const EMOJI = {
  heart: 'https://cdn.discordapp.com/emojis/1386783891150602411.png',
  coins: 'https://cdn.discordapp.com/emojis/1387149871987036260.png',
  subscriber: 'https://cdn.discordapp.com/emojis/1396632869673107556.png',
  pawns: {
    'Red Pawn': 'https://cdn.discordapp.com/emojis/1432123673812144208.png',
    'Brown Pawn': 'https://cdn.discordapp.com/emojis/1402336202345943183.png',
    'Green Pawn': 'https://cdn.discordapp.com/emojis/1394590550388244500.png',
    'Blue Pawn': 'https://cdn.discordapp.com/emojis/1394590552124555284.png',
    'White Pawn': 'https://cdn.discordapp.com/emojis/1393381385535881257.png',
    'Orange Pawn': 'https://cdn.discordapp.com/emojis/1394590554171510834.png',
    'Pink Pawn': 'https://cdn.discordapp.com/emojis/1393334400397348976.png',
    'Yellow Pawn': 'https://cdn.discordapp.com/emojis/1393334434836648110.png',
    'Blueman Pawn': 'https://cdn.discordapp.com/emojis/1393334476930809969.png',
    'Purple Pawn': 'https://cdn.discordapp.com/emojis/1393334458190532788.png',
    'Gold Pawn': 'https://cdn.discordapp.com/emojis/1400679438026276875.png',
    'Clear Pawn': 'https://cdn.discordapp.com/emojis/1420199424700711023.png',
    'Ruby Pawn': 'https://cdn.discordapp.com/emojis/1396584128509513818.png',
    'Cyan Pawn': 'https://cdn.discordapp.com/emojis/1393836845539790918.png',
    'Diamond Pawn': 'https://cdn.discordapp.com/emojis/1396671445601488936.png',
    'Black Pawn': 'https://cdn.discordapp.com/emojis/1393353872927490270.png',
    'Emerald Pawn': 'https://cdn.discordapp.com/emojis/1399300789050282035.png'
  }
};

const PAWN_ORDER = [
  'Emerald Pawn', 'Black Pawn', 'Diamond Pawn', 'Cyan Pawn', 'Ruby Pawn',
  'Clear Pawn', 'Gold Pawn', 'Purple Pawn', 'Blueman Pawn', 'Yellow Pawn',
  'Pink Pawn', 'Orange Pawn', 'White Pawn', 'Blue Pawn', 'Green Pawn',
  'Brown Pawn', 'Red Pawn'
];

async function loadImg(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw 1;
    const buf = Buffer.from(await res.arrayBuffer());
    return await loadImage(await sharp(buf).png().toBuffer());
  } catch (e) {
    console.log('Failed to load image:', url);
    return await loadImage(await sharp({ create: { width: 1, height: 1, channels: 4, background: '#0000' } }).png().toBuffer());
  }
}

export default {
  name: 'profile',
  async execute(message, args) {
    let target = message.author;
    if (message.mentions.users.size) target = message.mentions.users.first();

    const userId = target.id;
    const balance = getUserBalance(userId);
    const profile = getUserProfile(userId) || { status: 'Use .x status <text>', banner: 'default' };

    // VIP Check
    const member = await message.guild.members.fetch(userId);
    const isBooster = member.premiumSince !== null;
    const isSubscriber = member.roles.cache.has('1396682174408822885');
    const isVIP = isBooster || isSubscriber;

    // Find rarest pawn
    const owned = db.prepare('SELECT itemName FROM user_items WHERE userId = ?').all(userId);
    const bestPawn = PAWN_ORDER.find(pawn => owned.some(i => i.itemName === pawn));

    // Canvas: 920×320 (900×300 + 10px padding)
    const canvas = createCanvas(920, 320);
    const ctx = canvas.getContext('2d');

    // LOCAL BACKGROUND
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const bgPath = path.join(__dirname, '..', 'assets', 'profile_bg.png');
    let banner;
    try {
      banner = await loadImage(bgPath);
    } catch (err) {
      console.warn('[Profile] Local background not found:', bgPath);
      banner = await loadImage(await sharp({
        create: { width: 900, height: 300, channels: 4, background: '#2f3136' }
      }).png().toBuffer());
    }
    ctx.drawImage(banner, 10, 10, 900, 300);

    // Overlays
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(10, 10, 900, 300);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(10, 280, 900, 30);

    // Avatar
    const avatar = await loadImg(target.displayAvatarURL({ size: 256, format: 'png', dynamic: false }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(160, 125, 75, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 85, 50, 150, 150);
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Username
    ctx.fillStyle = 'white';
    ctx.font = 'bold 44px Arial';
    ctx.fillText(target.username.slice(0, 20), 260, 135);

    // Status
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    const status = profile.status.length > 90 ? profile.status.slice(0, 87) + '...' : profile.status;
    ctx.fillText(status, 30, 300);

    // Relationship
    const heart = await loadImg(EMOJI.heart);
    ctx.drawImage(heart, 260, 140, 35, 35);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    const spouseId = getSpouse(target.id);
    if (spouseId) {
      const spouse = await message.client.users.fetch(spouseId);
      ctx.fillText(`${spouse.username}`, 302, 168);
    } else {
      ctx.fillText('Single', 302, 168);
    }

    // Balance
    const coins = await loadImg(EMOJI.coins);
    ctx.drawImage(coins, 40, 220, 50, 50);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(balance.toLocaleString(), 95, 255);

    // Pawn
    if (isVIP) {
      const subscriberPawn = await loadImg(EMOJI.subscriber);
      ctx.drawImage(subscriberPawn, 810, 50, 90, 90);
    } else if (bestPawn && EMOJI.pawns[bestPawn]) {
      const pawn = await loadImg(EMOJI.pawns[bestPawn]);
      ctx.drawImage(pawn, 810, 50, 90, 90);
    }

    // GRADIENT GLOW BORDER (VIP ONLY)
    if (isVIP) {
      const gradient = ctx.createLinearGradient(0, 0, 920, 320);
      gradient.addColorStop(0, '#ff69b4');    // Hot Pink
      gradient.addColorStop(0.3, '#d946ef');  // Purple
      gradient.addColorStop(0.7, '#8b5cf6');  // Violet
      gradient.addColorStop(1, '#3b82f6');    // Blue

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Glow
      ctx.shadowColor = '#ff69b4';
      ctx.shadowBlur = 20;

      // Draw outer stroke
      ctx.strokeRect(6, 6, 908, 308); // 920-12, 320-12

      // Reset shadow
      ctx.shadowBlur = 0;
    }

    // Send
    await message.reply({
      content: `**${target.username}'s server card**${isVIP ? ' VIP' : ''}`,
      files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' })],
      allowedMentions: { repliedUser: false }
    });
  }
};