import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { getUserBalance } from './db.js';
import config from './config.json' assert { type: 'json' };

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
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === 'ping') {
    return message.reply('🏓 Pong!');
  }

  if (command === 'balance') {
    const balance = getUserBalance(message.author.id);
    return message.reply(`You have ${xatEmoji} ${balance} xats.`);
  }
});

client.login(token);