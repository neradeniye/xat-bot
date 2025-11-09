// commands/profile.js
import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import { getUserBalance, getUserProfile, db } from '../db.js';

// === CONFIG: YOUR CUSTOM EMOJIS (REPLACE WITH YOUR SERVER'S) ===
const EMOJI = {
  heart: 'https://cdn.discordapp.com/emojis/1386783891150602411.png', // your heart
  coins: 'https://cdn.discordapp.com/emojis/1387149871987036260.png', // your coins
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

// === PAWN VALUE ORDER (HIGHEST TO LOWEST) ===
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
  } catch {
    const fallback = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#00000000' } }).png().toBuffer();
    return await loadImage(fallback);
  }
}

export default {
  name: 'profile',
  async execute(message, args) {
    let target = message.author;
    if (message.mentions.users.size) target = message.mentions.users.first();

    const userId = target.id;
    const balance = getUserBalance(userId);
    const profile = getUserProfile(userId) || { status: 'Use .x setstatus <text>', banner: 'default' };

    // === FIND RAREST PAWN ===
    const ownedItems = db.prepare('SELECT itemName FROM user_items WHERE userId = ?').all(userId);
    let bestPawn = null;
    for (const pawn of PAWN_ORDER) {
      if (ownedItems.some(i => i.itemName === pawn)) {
        bestPawn = pawn;
        break;
      }
    }

    const canvas = createCanvas(900, 300);
    const ctx = canvas.getContext('2d');

    // Banner
    const banner = await loadImg('https://wallpapercave.com/wp/wp8944221.jpg');
    ctx.drawImage(banner, 0, 0, 900, 300);

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 900, 300);

    /*

    // Rank
    ctx.fillStyle = '#a0a0ff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('#471', 30, 55);

    */

    // Avatar
    const avatar = await loadImg(target.displayAvatarURL({ size: 256, format: 'png', dynamic: false }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 115, 75, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 75, 40, 150, 150);
    ctx.restore();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'white';
    ctx.stroke();

    // Username
    ctx.fillStyle = 'white';
    ctx.font = 'bold 44px Arial';
    ctx.fillText(target.username.slice(0, 18), 250, 125);

    // Status bar
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, 20, 200, 860, 60, 15);
    ctx.fill();

    // Status text
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    const status = profile.status.length > 85 ? profile.status.slice(0, 82) + '...' : profile.status;
    ctx.fillText(status, 20, 290);

    // Heart + username
    const heartImg = await loadImg(EMOJI.heart);
    ctx.drawImage(heartImg, 250, 130, 35, 35);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Single', 292, 160);

    // Coins + balance
    const coinsImg = await loadImg(EMOJI.coins);
    ctx.drawImage(coinsImg, 30, 210, 50, 50);
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(balance.toLocaleString(), 85, 245);

    // Pawn flex
    if (bestPawn && EMOJI.pawns[bestPawn]) {
      const pawnImg = await loadImg(EMOJI.pawns[bestPawn]);
      ctx.drawImage(pawnImg, 800, 50, 80, 80);
    }

    // Send
    await message.reply({
      content: `**${target.username}'s Profile**`,
      files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' })],
      allowedMentions: { repliedUser: false }
    });
  }
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}