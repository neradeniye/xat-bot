const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const db = require('./db');
require('dotenv').config();

const prefix = process.env.PREFIX || '.x';
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = new Map();

// Load each command into a map
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.set(command.name, command);
}

client.on('messageCreate', message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = commands.get(commandName);
  if (!command) return;

  try {
    command.execute(message, args, db);
  } catch (error) {
    console.error(error);
    message.reply('There was an error trying to execute that command.');
  }
});

client.login(process.env.DISCORD_TOKEN);