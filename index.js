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
} from './db.js';

global.lootboxActive = false;
global.lootboxClaimed = false;

const REWARD_CHANNEL_ID = '1484552931775742115';
const LOOTBOX_CHANNEL_ID = '1484552931775742115';
const cooldowns = new Map();
const EXCLUDED_ROLE_ID = '1385722392764092558';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { prefix } = config;
const token = process.env.DISCORD_TOKEN;

// Load commands
const commands = new Map();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = (await import(`./commands/${file}`)).default;
  commands.set(command.name, command);
}

// Add GuildMembers intent
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers  // REQUIRED for leave/rejoin
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity('for .x help', { type: 3 });

  // ====================== CHANNEL ROTATOR ======================
  const ROTATOR_INTERVAL_MS = 5 * 60 * 1000;        // 5 minutes for testing
  // const ROTATOR_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours when ready
  // const ROTATOR_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const TARGET_CHANNEL_NAME = "flirt";           // ← Name of the rotating channel
  const TEMPLATE_CHANNEL_ID = "1495207571873726584"; // ← ← ← CHANGE THIS

  async function rotateChannel() {
    const guild = client.guilds.cache.first(); // or client.guilds.cache.get('YOUR_GUILD_ID')
    if (!guild) return console.error('[Rotator] Guild not found');

    // Find the currently active rotator channel (from DB)
    const currentChannelId = getRotatorChannelId();
    let currentChannel = currentChannelId ? guild.channels.cache.get(currentChannelId) : null;

    // Determine which channel to clone from
    let sourceChannel = currentChannel;

    // === FIRST RUN / NO CURRENT ROTATOR CHANNEL ===
    if (!sourceChannel && TEMPLATE_CHANNEL_ID) {
      sourceChannel = guild.channels.cache.get(TEMPLATE_CHANNEL_ID);
      if (!sourceChannel) {
        console.error(`[Rotator] Template channel ID ${TEMPLATE_CHANNEL_ID} not found!`);
        return;
      }
      console.log(`[Rotator] First run — cloning from template channel: ${sourceChannel.name}`);
    }

    // Delete the old rotator channel (only if it's NOT the template)
    if (currentChannel) {
      try {
        await currentChannel.delete('Channel rotator - replacing with fresh clone');
        console.log(`[Rotator] Deleted old rotator channel: ${currentChannel.name}`);
      } catch (err) {
        console.error('[Rotator] Failed to delete old channel:', err.message);
      }
    }

    // Small safety delay after delete
    if (currentChannel) await new Promise(r => setTimeout(r, 1500));

    // Create the new cloned channel
    try {
      const newChannel = await guild.channels.create({
        name: TARGET_CHANNEL_NAME,
        type: 0, // Text channel
        permissionOverwrites: sourceChannel.permissionOverwrites.cache,
        parent: sourceChannel.parentId,
        topic: sourceChannel.topic || `Fresh channel • Last refreshed: <t:${Math.floor(Date.now()/1000)}:R>`,
        nsfw: sourceChannel.nsfw,
        rateLimitPerUser: sourceChannel.rateLimitPerUser,
        reason: 'Channel rotator - creating fresh clone'
      });

      setRotatorChannelId(newChannel.id);
      console.log(`[Rotator] ✅ Created new cloned channel: ${newChannel.name} (${newChannel.id})`);

      // Welcome message in the new channel
      await newChannel.send({
        content: `🆕 **Main chat channel has been refreshed!**\nAll previous messages cleared.\nThis channel auto-refreshes every ${ROTATOR_INTERVAL_MS / (1000 * 60 * 60)} hours.`
      });

    } catch (err) {
      console.error('[Rotator] Failed to create new channel:', err);
    }
  }

  // Start the rotator
  console.log(`[Rotator] Starting automatic channel rotation every ${ROTATOR_INTERVAL_MS / 60000} minutes...`);
  rotateChannel();                    // Run immediately
  setInterval(rotateChannel, ROTATOR_INTERVAL_MS);

  // 12-hour reward loop
  setInterval(async () => {
    const topUser = getTopMessageUser();
    if (!topUser) return console.log('[Reward] No top user.');

    try {
      const guild = client.guilds.cache.first();
      const member = await guild.members.fetch(topUser.user_id).catch(() => null);
      if (!member || member.roles.cache.has(EXCLUDED_ROLE_ID)) {
        console.log(`[Reward] Skipping ${topUser.user_id} (excluded role)`);
        return;
      }

      const channel = guild.channels.cache.get(REWARD_CHANNEL_ID);
      if (!channel) return console.error('[Reward] Channel not found');

      addUserXats(topUser.user_id, 200);
      await channel.send(`Congratulations ${member} — you've earned **200 xats** for being the most active in the last 12 hours!`);
      console.log(`[Reward] Given to ${member.user.tag}`);
      resetMessageCounts();
    } catch (err) {
      console.error('[Reward Loop Error]', err);
    }
  }, 43_200_000);
});

// Lootbox scheduler (unchanged)
function scheduleLootbox() {
  const delay = Math.floor(Math.random() * 5 + 2) * 60 * 60 * 1000; // 2–6 hours
  setTimeout(async () => {
    const guild = client.guilds.cache.first();
    const channel = guild.channels.cache.get(LOOTBOX_CHANNEL_ID);
    if (!channel) return scheduleLootbox();

    global.lootboxActive = true;
    global.lootboxClaimed = false;
    await channel.send('A lootbox has appeared! Type `.x claim` to get the reward!');
    console.log('[Lootbox] Spawned.');

    setTimeout(async () => {
      if (!global.lootboxClaimed) {
        global.lootboxActive = false;
        await channel.send('Nobody claimed the lootbox. It has been destroyed! You lose. You get nothing. Good day sir.');
      }
    }, 15_000);

    scheduleLootbox();
  }, delay);
}
scheduleLootbox();

// MESSAGE HANDLER + COMMAND BAN + MOCKING
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  incrementMessageCount(message.author.id);

  // Xat reward per 10s
  const now = Date.now();
  const lastUsed = cooldowns.get(message.author.id) || 0;
  if (now - lastUsed >= 10_000) {
    addUserXats(message.author.id, 1);
    cooldowns.set(message.author.id, now);
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  const command = commands.get(commandName);
  if (command) command.execute(message, args, client);
});

// CLEANUP ON BOOST STOP (unchanged)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const userId = newMember.id;
  const wasBoosting = oldMember.premiumSince;
  const isBoosting = newMember.premiumSince;

  if (wasBoosting && !isBoosting) {
    try {
      const colorRecord = getUserColorRole(userId);
      if (colorRecord?.role_id) {
        const role = newMember.guild.roles.cache.get(colorRecord.role_id);
        if (role) await role.delete('User stopped boosting');
        removeUserColorRole(userId);
      }

      const gradRecord = getUserGradient(userId);
      if (gradRecord?.role_id) {
        const role = newMember.guild.roles.cache.get(gradRecord.role_id);
        if (role) await newMember.roles.remove(role);
        removeUserGradient(userId);
      }
    } catch (err) {
      console.error('[BOOSTER CLEANUP ERROR]', err);
    }
  }
});

client.login(token);