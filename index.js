import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getTopMessageUser,
  resetMessageCounts,
  addUserXats,
  incrementMessageCount
  // existing imports...
} from './db.js';

global.lootboxActive = false;
global.lootboxClaimed = false;

const messageCounts = new Map(); // userId → message count
const REWARD_CHANNEL_ID = '1391230063600730272'; // Replace with your channel ID
const LOOTBOX_CHANNEL_ID = '1391230063600730272'; // Replace with your specific lootbox channel ID
const cooldowns = new Map(); // userId → timestamp
const EXCLUDED_ROLE_ID = '1385722392764092558';


const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { prefix, announcementChannel } = config;
const token = process.env.DISCORD_TOKEN;

// Load commands
const commands = new Map();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = (await import(`./commands/${file}`)).default;
  commands.set(command.name, command);
}

// Set up bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
  client.user.setActivity('for .x help', { type: 3 }); // 👀 Watching for .x

// Give reward every 12 hours (43,200,000 ms)
setInterval(async () => {
  const topUser = getTopMessageUser();
  if (!topUser) {
    console.log('[Reward] No top user found.');
    return;
  }

  try {
    const guild = client.guilds.cache.first(); // or use specific ID if needed
    const member = await guild.members.fetch(topUser.user_id).catch(() => null);
    if (!member || member.roles.cache.has(EXCLUDED_ROLE_ID)) {
    console.log(`[Reward] User ${top.user_id} has excluded role. Skipping reward.`);
    return;
  }
    const channel = guild.channels.cache.get(REWARD_CHANNEL_ID);

    if (!member || !channel) {
      console.error('[Reward] Could not fetch member or channel.');
      return;
    }

    addUserXats(topUser.user_id, 200);
    await channel.send(`🎉 Congratulations ${member} — you've earned **200 xats** for being the most active in the last 12 hours!`);

    console.log(`[Reward] Given to ${member.user.tag}`);
    resetMessageCounts();
  } catch (err) {
    console.error('[Reward Loop Error]', err);
  }
}, 43_200_000); // 12 hours
});

function scheduleLootbox() {
  const delay = Math.floor(Math.random() * (6 - 2 + 1) + 2) * 60 * 60 * 1000; // 2–6 hours

  setTimeout(async () => {
    const guild = client.guilds.cache.first();
    const channel = guild.channels.cache.get(LOOTBOX_CHANNEL_ID);
    if (!channel) {
      console.error('[Lootbox] Could not find lootbox channel.');
      return scheduleLootbox(); // Schedule next even if failed
    }

    global.lootboxActive = true;
    global.lootboxClaimed = false;

    await channel.send('🎁 A lootbox has appeared! Type `.x claim` to get the reward!');
    console.log('[Lootbox] Spawned.');

    // ⏳ 30-second timeout to expire the lootbox
    setTimeout(async () => {
      if (!global.lootboxClaimed) {
        global.lootboxActive = false;
        await channel.send('💥 Sorry! Nobody claimed the lootbox. It has been destroyed!');
        console.log('[Lootbox] Timed out and destroyed.');
      }
    }, 30_000); // 30 seconds

    scheduleLootbox(); // Chain next box
  }, delay);
}

scheduleLootbox(); // Start the loop

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (!message.author.bot) {
  incrementMessageCount(message.author.id);
}

  // Earn 1 xat per 10 seconds
  const now = Date.now();
  const lastUsed = cooldowns.get(message.author.id) || 0;

  if (now - lastUsed >= 10_000) {
    addUserXats(message.author.id, 1);
    cooldowns.set(message.author.id, now);
  }

  // Handle command
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();

  const command = commands.get(commandName);
  if (command) {
    command.execute(message, args, client);
  }
});

import {
  getUserColorRole,
  removeUserColorRole,
  getUserGradient,
  removeUserGradient
} from './db.js';

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const userId = newMember.id;

  const wasBoosting = oldMember.premiumSince;
  const isBoosting = newMember.premiumSince;

  // Only act when user stops boosting
  if (wasBoosting && !isBoosting) {
    try {
      // Remove custom color role
      const colorRecord = getUserColorRole(userId);
      if (colorRecord) {
        const colorRole = newMember.guild.roles.cache.get(colorRecord.role_id);
        if (colorRole) await colorRole.delete('User stopped boosting - removing custom color');
        removeUserColorRole(userId);
        console.log(`[BOOSTER CLEANUP] Removed custom color role from ${newMember.user.tag}`);
      }

      // Remove gradient role
      const gradRecord = getUserGradient(userId);
      if (gradRecord) {
        const gradRole = newMember.guild.roles.cache.get(gradRecord.role_id);
        if (gradRole) await newMember.roles.remove(gradRole);
        removeUserGradient(userId);
        console.log(`[BOOSTER CLEANUP] Removed gradient role from ${newMember.user.tag}`);
      }

    } catch (err) {
      console.error(`[BOOSTER CLEANUP ERROR]`, err);
    }
  }
});

client.login(token);