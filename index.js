import 'dotenv/config';
import fs from 'fs';
import { Client, GatewayIntentBits } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getTopMessageUser,
  resetMessageCounts,
  addUserXats,
  incrementMessageCount,
  getRotatorChannelId,
  setRotatorChannelId
} from './db.js';

global.lootboxActive = false;
global.lootboxClaimed = false;

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
  //const ROTATOR_INTERVAL_MS = 5 * 60 * 1000;        // 5 minutes for testing
  const ROTATOR_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours when ready

  const TARGET_CHANNEL_NAME = "・flirt";           
  const TEMPLATE_CHANNEL_ID = "1495207571873726584"; // ← your baseline channel ID

  async function rotateChannel() {
    const guild = client.guilds.cache.first();
    if (!guild) return console.error('[Rotator] Guild not found');

    const currentChannelId = getRotatorChannelId();
    let currentChannel = currentChannelId ? guild.channels.cache.get(currentChannelId) : null;

    let sourceChannel = currentChannel;

    // First run: clone from your template channel
    if (!sourceChannel && TEMPLATE_CHANNEL_ID) {
      sourceChannel = guild.channels.cache.get(TEMPLATE_CHANNEL_ID);
      if (!sourceChannel) {
        console.error(`[Rotator] Template channel ${TEMPLATE_CHANNEL_ID} not found!`);
        return;
      }
      console.log(`[Rotator] First run — cloning from template: ${sourceChannel.name}`);
    }

    if (!sourceChannel) {
      console.error('[Rotator] No source channel available.');
      return;
    }

    // Delete the old rotator channel
    if (currentChannel) {
      try {
        await currentChannel.delete('Channel rotator - replacing with fresh clone');
        console.log(`[Rotator] Deleted old channel: ${currentChannel.name}`);
      } catch (err) {
        console.error('[Rotator] Failed to delete old channel:', err.message);
      }
    }

    // Small delay after delete
    if (currentChannel) await new Promise(r => setTimeout(r, 1500));

    try {
      // Create the new cloned channel (still at bottom for now)
      const newChannel = await guild.channels.create({
        name: TARGET_CHANNEL_NAME,
        type: 0,
        permissionOverwrites: sourceChannel.permissionOverwrites.cache,
        parent: sourceChannel.parentId,
        topic: sourceChannel.topic || `Main channel • Last cleared: <t:${Math.floor(Date.now()/1000)}:R>`,
        nsfw: sourceChannel.nsfw,
        rateLimitPerUser: sourceChannel.rateLimitPerUser,
        reason: 'Channel rotator - creating fresh clone'
      });

      // === MOVE TO TOP ===
      // Get all text channels in the same category (or guild if no category)
      const channelsInSameParent = guild.channels.cache
        .filter(ch => ch.type === 0 && ch.parentId === newChannel.parentId)
        .sort((a, b) => a.position - b.position);

      const topPosition = channelsInSameParent.size > 0 ? channelsInSameParent.first().position : 0;

      // Move the new channel to the very top
      await newChannel.setPosition(topPosition, { reason: 'Channel rotator - moving to top' });

      setRotatorChannelId(newChannel.id);
      console.log(`[Rotator] ✅ Created & moved new channel to TOP: ${newChannel.name} (${newChannel.id})`);

      // Welcome message
      await newChannel.send({
        content: `**Main chat channel has been refreshed!**\nAll old messages have been purged.\nThis channel will automatically clear every 12 hours.`
      });

    } catch (err) {
      console.error('[Rotator] Failed to create/move new channel:', err);
    }
  }

  console.log(`[Rotator] Starting automatic channel rotation every ${ROTATOR_INTERVAL_MS / 60000} minutes...`);
  rotateChannel();
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

// Helper to get the current main channel (falls back to name search if DB is empty)
async function getMainChannel(guild) {
  const storedId = getRotatorChannelId();
  if (storedId) {
    const ch = guild.channels.cache.get(storedId);
    if (ch) return ch;
  }

  // Fallback: find by name
  return guild.channels.cache.find(ch => ch.type === 0 && ch.name === TARGET_CHANNEL_NAME);
}

// ====================== REWARD SYSTEM (every 12 hours) ======================
setInterval(async () => {
  const topUser = getTopMessageUser();
  if (!topUser) return console.log('[Reward] No top user found.');

  const guild = client.guilds.cache.first();
  const channel = await getMainChannel(guild);

  if (!channel) {
    return console.error('[Reward] Could not find main channel.');
  }

  const member = await guild.members.fetch(topUser.user_id).catch(() => null);
  if (!member || member.roles.cache.has(EXCLUDED_ROLE_ID)) {
    console.log(`[Reward] Skipped user ${topUser.user_id} (excluded role or not found).`);
    return;
  }

  addUserXats(topUser.user_id, 200);
  await channel.send(`🎉 Congratulations ${member} — you've earned **200 xats** for being the most active in the last 12 hours!`);

  console.log(`[Reward] Given to ${member.user.tag}`);
  resetMessageCounts();
}, 43_200_000);

// ====================== LOOTBOX SYSTEM ======================
function scheduleLootbox() {
  const delay = Math.floor(Math.random() * (4 - 2 + 1) + 2) * 60 * 60 * 1000; // 2–6 hours

  setTimeout(async () => {
    const guild = client.guilds.cache.first();
    const channel = await getMainChannel(guild);

    if (!channel) {
      console.error('[Lootbox] Could not find main channel.');
      return scheduleLootbox();
    }

    global.lootboxActive = true;
    global.lootboxClaimed = false;

    await channel.send('🎁 A lootbox has appeared! Type `.x claim` to get the reward!');
    console.log('[Lootbox] Spawned in main channel.');

    setTimeout(async () => {
      if (!global.lootboxClaimed) {
        global.lootboxActive = false;
        await channel.send('💥 Sorry! Nobody claimed the lootbox. It has been destroyed!');
      }
    }, 15_000);

    scheduleLootbox(); // next one
  }, delay);
}

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