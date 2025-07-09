const cooldowns = new Map(); // userId → timestamp

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { getUserBalance } from './db.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { prefix, xatEmoji } = config;
const token = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  // 10 second cooldown
const now = Date.now();
const lastUsed = cooldowns.get(message.author.id) || 0;

if (now - lastUsed >= 10_000) {
  import('./db.js').then(({ addUserXats }) => {
    addUserXats(message.author.id, 1);
    cooldowns.set(message.author.id, now);
    console.log(`[+1 xat] ${userId}`);
  });
}
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === 'ping') {
    return message.reply('🏓 Pong!');
  }

  if (command === 'balance') {
    const balance = getUserBalance(message.author.id);
    return message.reply(`You have ${balance} ${xatEmoji} xats.`);
  }
});

client.login(token);