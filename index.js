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
  getUserColorRole,
  removeUserColorRole,
  getUserGradient,
  removeUserGradient,
  getUserBanner,
  removeUserBanner,
  getRecentActiveUsers,
  getUserCustomRole,
  removeUserCustomRole
} from './db.js';

import { setCurrentImposter } from './commands/choose.js';

// Prevent duplicate starts
if (global.xatBotStarted) {
  console.log('[WARN] Duplicate bot start detected - exiting');
  process.exit(0);
}
global.xatBotStarted = true;

global.lootboxActive = false;
global.lootboxClaimed = false;

const cooldowns = new Map();
const EXCLUDED_ROLE_ID = '1385722392764092558';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { prefix } = config;
const token = process.env.DISCORD_TOKEN;

// Load commands with alias support
const commands = new Map();   // primary name → command
const aliases = new Map();    // alias → command

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = (await import(`./commands/${file}`)).default;

  // Register primary name
  if (command.name) {
    commands.set(command.name.toLowerCase(), command);
  }

  // Register aliases
  if (command.aliases && Array.isArray(command.aliases)) {
    for (const alias of command.aliases) {
      aliases.set(alias.toLowerCase(), command);
    }
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
  client.user.setActivity('for .x help', { type: 3 });

  const MAIN_CHANNEL_ID = '1502176270518325310';

  async function getMainChannel(guild) {
    const channel = guild.channels.cache.get(MAIN_CHANNEL_ID);
    if (!channel) {
      console.error(`[Main Channel] Channel with ID ${MAIN_CHANNEL_ID} not found!`);
      return null;
    }
    return channel;
  }

  // ====================== REWARD SYSTEM ======================
  setInterval(async () => {
    const topUser = getTopMessageUser();
    if (!topUser) return console.log('[Reward] No top user found.');

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const channel = await getMainChannel(guild);
    if (!channel) return;

    const member = await guild.members.fetch(topUser.user_id).catch(() => null);
    if (!member || member.roles.cache.has(EXCLUDED_ROLE_ID)) {
      console.log(`[Reward] Skipped user ${topUser.user_id}`);
      return;
    }

    addUserXats(topUser.user_id, 200);
    await channel.send(`🎉 Congratulations ${member} — you've earned **200 xats** for being the most active in the last 12 hours!`);

    console.log(`[Reward] Given to ${member.user.tag}`);
    resetMessageCounts();
  }, 43_200_000);

  // ====================== LOOTBOX SYSTEM ======================
  function scheduleLootbox() {
    const delay = Math.floor(Math.random() * (4 - 2 + 1) + 2) * 60 * 60 * 1000;

    setTimeout(async () => {
      const guild = client.guilds.cache.first();
      if (!guild) return scheduleLootbox();

      const channel = await getMainChannel(guild);
      if (!channel) return scheduleLootbox();

      global.lootboxActive = true;
      global.lootboxClaimed = false;

      await channel.send('🎁 A lootbox has appeared! Type `.x claim` to get the reward!');
      console.log('[Lootbox] Spawned.');

      setTimeout(async () => {
        if (!global.lootboxClaimed) {
          global.lootboxActive = false;
          await channel.send('💥 Sorry! Nobody claimed the lootbox. It has been destroyed!');
        }
      }, 45_000);

      scheduleLootbox();
    }, delay);
  }

  // ====================== THE IMPOSTER SYSTEM ======================
  function scheduleImposter() {
    const delay = Math.floor(Math.random() * (5 - 3 + 1) + 3) * 60 * 60 * 1000; // 3–5 hours

    setTimeout(async () => {
      const guild = client.guilds.cache.first();
      if (!guild) return scheduleImposter();

      const channel = await getMainChannel(guild);
      if (!channel) return scheduleImposter();

      const activeRows = getRecentActiveUsers(30);
      if (activeRows.length < 5) {
        console.log('[Imposter] Not enough active users');
        return scheduleImposter();
      }

      const selected = [];
      for (const row of activeRows.slice(0, 5)) {
        try {
          const user = await client.users.fetch(row.user_id);
          selected.push(user);
        } catch (err) {
          selected.push({ username: `User${row.user_id.slice(-4)}`, id: row.user_id });
        }
      }

      const imposterIndex = Math.floor(Math.random() * 5);
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const answer = letters[imposterIndex];

      setCurrentImposter({ answer, rewardGiven: false });

      let description = '**🕵️ ONE OF THESE USERS IS THE IMPOSTER! 🕵️**\n\n';
      selected.forEach((user, i) => {
        description += `${letters[i]} — **${user.username}**\n`;
      });

      await channel.send({
        content: description + '\nFirst to guess correctly with `.x choose A/B/C/D/E` wins **100 xats**!\nWrong guess = **-200 xats**'
      });

      console.log(`[Imposter] Spawned — Answer: ${answer}`);

      setTimeout(() => {
        const current = getCurrentImposter?.();
        if (current && !current.rewardGiven) {
          channel.send('⏰ The Imposter got away... Better luck next time!');
          setCurrentImposter(null);
        }
      }, 120_000);

      scheduleImposter();
    }, delay);
  }

  scheduleLootbox();
  scheduleImposter();
});

// ==================== MESSAGE HANDLER ====================
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  incrementMessageCount(message.author.id);

  const now = Date.now();
  const lastUsed = cooldowns.get(message.author.id) || 0;
  if (now - lastUsed >= 10_000) {
    addUserXats(message.author.id, 1);
    cooldowns.set(message.author.id, now);
  }

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();

  // Support both primary name and aliases
  const command = commands.get(commandName) || aliases.get(commandName);

  if (command) {
    command.execute(message, args, client);
  }
});

// ==================== BOOSTER CLEANUP ====================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  const userId = newMember.id;
  const wasBoosting = oldMember.premiumSince;
  const isBoosting = newMember.premiumSince;

  if (wasBoosting && !isBoosting) {
    try {
      const colorRecord = getUserColorRole(userId);
      if (colorRecord?.role_id) {
        const role = newMember.guild.roles.cache.get(colorRecord.role_id);
        if (role) await role.delete('User stopped boosting - removing custom color');
        removeUserColorRole(userId);
      }

      const gradRecord = getUserGradient(userId);
      if (gradRecord?.role_id) {
        const role = newMember.guild.roles.cache.get(gradRecord.role_id);
        if (role) await newMember.roles.remove(role);
        removeUserGradient(userId);
      }

      const bannerRecord = getUserBanner(userId);
      if (bannerRecord) {
        removeUserBanner(userId);
        console.log(`[BOOSTER CLEANUP] Removed custom banner from ${newMember.user.tag}`);
      }

      const customRecord = getUserCustomRole(userId);
      if (customRecord?.role_id) {
        const role = newMember.guild.roles.cache.get(customRecord.role_id);
        if (role) await role.delete('User stopped boosting - removing custom role').catch(() => {});
        removeUserCustomRole(userId);
        console.log(`[BOOSTER CLEANUP] Removed custom role from ${newMember.user.tag}`);
      }

    } catch (err) {
      console.error('[BOOSTER CLEANUP ERROR]', err);
    }
  }
});

client.login(token);