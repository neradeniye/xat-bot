const fs = require('fs');
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./db');
const { token, prefix } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = new Map();
fs.readdirSync('./commands').forEach(file => {
  const command = require(`./commands/${file}`);
  commands.set(command.name, command);
});

const cooldowns = new Map();

client.on('messageCreate', message => {
  if (message.author.bot) return;

  // Earn 1 xat every 10 seconds
  const lastEarn = cooldowns.get(message.author.id) || 0;
  if (Date.now() - lastEarn >= 10_000) {
    db.addXat(message.author.id, 1);
    cooldowns.set(message.author.id, Date.now());
  }

  // Command handling
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();

  const command = commands.get(cmdName);
  if (command) {
    command.run(message, args);
  }
});

client.once('ready', () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);