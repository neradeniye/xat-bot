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
  recordLeave,
  getLeaveRecord,
  removeLeaveRecord,
  setCommandBan,
  getCommandBan,
  removeCommandBan
} from './db.js';

global.lootboxActive = false;
global.lootboxClaimed = false;

const REWARD_CHANNEL_ID = '1391230063600730272';
const LOOTBOX_CHANNEL_ID = '1391230063600730272';
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

  // CHECK COMMAND BAN
  const ban = getCommandBan(message.author.id);
  if (ban) {
    const remainingHours = Math.max(0, Math.ceil((ban.ban_end - now) / (1000 * 60 * 60)));
    if (now < ban.ban_end) {
      const mockMessages = [
        `Oh look, the *server hopper* is back. No commands for **${remainingHours} hours**. Should’ve stayed loyal.`,
        `You left. We noticed. Now wait **${remainingHours} hours** like the traitor you are.`,
        `Welcome back, deserter! Commands locked for **${remainingHours} hours**. Enjoy the silence.`,
        `You ghosted the server? Now the bot ghosts you for **${remainingHours} hours**.`,
        `Haha, you thought you could just waltz back in? **${remainingHours}-hour timeout**, quitter.`,
        `Leaving is a choice. So is this: **${remainingHours} hours** of no bot access. Cry about it.`,
        `Back already? Too bad. **${remainingHours} hours** until you’re worthy again.`,
        `You ditched us. Now sit in the corner for **${remainingHours} hours**. No commands.`,
        `Pro tip: Don’t leave. Second tip: Wait **${remainingHours} hours** before trying again.`,
        `The prodigal user returns... but the bot says: **${remainingHours} hours** of shame.`
      ];
      const mock = mockMessages[Math.floor(Math.random() * mockMessages.length)];
      return message.reply(mock);
    } else {
      removeCommandBan(message.author.id); // Expired
    }
  }

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

// RECORD LEAVE
client.on('guildMemberRemove', member => {
  recordLeave(member.id);
  console.log(`[LEAVE] Recorded: ${member.user.tag}`);
});

// APPLY 48-HOUR BAN ON REJOIN
client.on('guildMemberAdd', member => {
  const leaveRecord = getLeaveRecord(member.id);
  if (leaveRecord) {
    const banEnd = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
    setCommandBan(member.id, banEnd);
    removeLeaveRecord(member.id);
    console.log(`[REJOIN] 48-hour command ban applied to ${member.user.tag}`);

    // Optional: DM or announce
    member.send(`You left the server. As punishment, you cannot use bot commands for **48 hours**.\n\n*Don't leave again.*`)
      .catch(() => console.log(`[DM] Could not DM ${member.user.tag}`));
  }
});

client.login(token);