require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Database = require('better-sqlite3');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

const prefix = process.env.PREFIX || '.x';

const db = new Database('./xats.sqlite');
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  userId TEXT PRIMARY KEY,
  xats INTEGER DEFAULT 0
)`).run();

// Cooldown map: userId -> timestamp (in milliseconds)
const cooldowns = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;

  // Handle earning xats (only on normal messages, not commands)
  if (!message.content.startsWith(prefix)) {
    const now = Date.now();
    const cooldownAmount = 10 * 1000; // 10 seconds in ms

    if (!cooldowns.has(userId) || now - cooldowns.get(userId) >= cooldownAmount) {
      // Get current user xats
      let user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
      if (!user) {
        db.prepare('INSERT INTO users (userId, xats) VALUES (?, 1)').run(userId);
      } else {
        db.prepare('UPDATE users SET xats = xats + 1 WHERE userId = ?').run(userId);
      }

      cooldowns.set(userId, now);
      // Optional: You can DM or react to acknowledge, but better keep silent to avoid spam.
    }
    return; // No command processing below since this isn’t a command
  }

  // Command processing below
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'balance') {
    let user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    if (!user) {
      db.prepare('INSERT INTO users (userId, xats) VALUES (?, 0)').run(userId);
      user = { userId, xats: 0 };
    }

    message.channel.send(`${message.author.username}, you have ${user.xats} xats.`);
  }
});

client.login(process.env.DISCORD_TOKEN);