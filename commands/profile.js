import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUserBalance, getUserProfile, db } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register font
registerFont(path.join(__dirname, '../fonts/Poppins-Bold.ttf'), { family: 'Poppins' });

const BANNERS = {
  default: 'https://i.imgur.com/removed.png',
  vip: 'https://i.imgur.com/vipbanner.jpg',
  diamond: 'https://i.imgur.com/diamondbanner.jpg'
};

export default {
  name: 'profile',
  async execute(message, args) {
    let target = message.author;
    if (message.mentions.users.size) target = message.mentions.users.first();

    const userId = target.id;
    const balance = getUserBalance(userId);
    const profile = getUserProfile(userId) || { status: 'Use .x setstatus <text>', banner: 'default' };
    const items = db.prepare('SELECT COUNT(*) as c FROM user_items WHERE userId = ?').get(userId)?.c || 0;

    // Create canvas
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 800, 300);
    gradient.addColorStop(0, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 300);

    // Banner (top)
    try {
      const banner = await loadImage(BANNERS[profile.banner] || BANNERS.default);
      ctx.drawImage(banner, 0, 0, 800, 140);
    } catch (e) {
      ctx.fillStyle = '#6e44ff';
      ctx.fillRect(0, 0, 800, 140);
    }

    // Avatar
    const avatar = await loadImage(target.displayAvatarURL({ size: 256, format: 'png' }));
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 150, 70, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 30, 80, 140, 140);
    ctx.restore();

    // Avatar border
    ctx.strokeStyle = '#6e44ff';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Username
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Poppins';
    ctx.fillText(target.username, 210, 120);

    // Status
    ctx.fillStyle = '#a29bfe';
    ctx.font = '28px Poppins';
    ctx.fillText(`"${profile.status}"`, 210, 170);

    // Stats background
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.roundRect(210, 190, 560, 90, 20).fill();

    // Stats
    ctx.fillStyle = '#6e44ff';
    ctx.font = 'bold 36px Poppins';
    ctx.fillText(balance.toLocaleString(), 280, 250);
    ctx.fillText(items, 480, 250);
    ctx.fillText('#1', 680, 250);

    ctx.fillStyle = '#ccc';
    ctx.font = '20px Poppins';
    ctx.fillText('XATS', 280, 280);
    ctx.fillText('ITEMS', 480, 280);
    ctx.fillText('RANK', 680, 280);

    // Send
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });

    await message.reply({
      content: `**${target.username}'s Profile**`,
      files: [attachment],
      allowedMentions: { repliedUser: false }
    });
  }
};

// Helper for rounded rect
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
  return this;
};