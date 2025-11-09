import { EmbedBuilder } from 'discord.js';
import { getUserBalance, getUserProfile, db } from '../db.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

const BANNER_MAP = {
  default: 'https://cdn.discordapp.com/attachments/1385719618886434927/1436918693211668731/wp8944221.png', // change this
  vip: 'https://cdn.discordapp.com/attachments/1234567890/vip-banner.png',
  diamond: 'https://cdn.discordapp.com/attachments/1234567890/diamond-banner.png'
};

export default {
  name: 'profile',
  async execute(message, args) {
    let target = message.author;
    if (message.mentions.users.size) {
      target = message.mentions.users.first();
    }

    const userId = target.id;
    const balance = getUserBalance(userId);
    const profile = getUserProfile(userId) || { status: 'No status set ~ .x setstatus', banner: 'default' };
    const items = db.prepare('SELECT COUNT(*) as c FROM user_items WHERE userId = ?').get(userId)?.c || 0;

    const bannerUrl = BANNER_MAP[profile.banner] || BANNER_MAP.default;

    // 🔥 MESSAGE.STYLE MASTERPIECE 🔥
    const html = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;800&display=swap');
      body { margin:0; padding:20px; background:#1a1a2e; font-family:'Poppins',sans-serif; }
      .card { 
        width:450px; height:600px; background:linear-gradient(135deg,#16213e,#0f3460); 
        border-radius:28px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.6);
        position:relative; border:4px solid #6e44ff;
      }
      .banner { width:100%; height:180px; object-fit:cover; }
      .avatar { 
        width:140px; height:140px; border-radius:50%; border:8px solid #6e44ff;
        position:absolute; top:120px; left:155px; box-shadow:0 10px 30px rgba(0,0,0,0.8);
      }
      .name { 
        text-align:center; color:white; font-size:32px; font-weight:800; margin-top:80px;
        text-shadow:0 4px 10px rgba(0,0,0,0.8);
      }
      .status { 
        text-align:center; color:#a29bfe; font-size:18px; margin:10px 40px; 
        background:rgba(110,68,255,0.2); padding:12px; border-radius:14px;
      }
      .stats { 
        display:flex; justify-content:space-around; margin-top:30px; color:white;
      }
      .stat { text-align:center; }
      .num { font-size:36px; font-weight:800; color:#6e44ff; }
      .label { font-size:14px; color:#bbb; }
    </style>
    <div class="card">
      <img src="${bannerUrl}" class="banner">
      <img src="${target.displayAvatarURL({ size: 512, format: 'png' })}" class="avatar">
      <div class="name">${target.username}</div>
      <div class="status">"${profile.status}"</div>
      <div class="stats">
        <div class="stat">
          <div class="num">${balance.toLocaleString()}</div>
          <div class="label">XATS</div>
        </div>
        <div class="stat">
          <div class="num">${items}</div>
          <div class="label">ITEMS</div>
        </div>
        <div class="stat">
          <div class="num">#1</div>
          <div class="label">RANK</div>
        </div>
      </div>
    </div>`;

    const url = `https://message.style/app/editor#${btoa(unescape(encodeURIComponent(html)))}`;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setImage(url)
      .setFooter({ text: 'Click the image to enlarge • .x setstatus to flex' });

    await message.reply({ embeds: [embed] });
  }
};