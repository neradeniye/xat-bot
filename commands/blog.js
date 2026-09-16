import fs from 'fs';
import {
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import {
  getUserBlog,
  setUserBlog,
  removeUserBlog,
  getBlogByChannel,
  getAllBlogs
} from '../db.js';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

const BLOG_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.UseExternalStickers,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageThreads,
  PermissionFlagsBits.ManageChannels
];

function subscriberRoleIds() {
  const raw = config.subscriberRoleIds ?? config.subscriberRoleId ?? [];
  return (Array.isArray(raw) ? raw : [raw]).filter(id => id && !String(id).startsWith('PASTE_'));
}

export function canHaveBlog(member) {
  if (member.premiumSince) return true;
  return subscriberRoleIds().some(id => member.roles.cache.has(id));
}

export function isStaff(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function sanitizeName(username) {
  const cleaned = String(username)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return cleaned || 'user';
}

function findBlogCategory(guild) {
  const configured = config.blogCategoryId;
  if (configured && !String(configured).startsWith('PASTE_')) {
    const byId = guild.channels.cache.get(configured);
    if (byId?.type === ChannelType.GuildCategory) return byId;
  }
  return guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && /blog/i.test(c.name)
  ) ?? null;
}

function ownerOverwrites(guild, userId, clientUserId, allowView) {
  return [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: userId,
      allow: allowView ? BLOG_PERMS : [],
      deny: allowView ? [] : [PermissionFlagsBits.ViewChannel]
    },
    {
      id: clientUserId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages
      ]
    }
  ];
}

async function applyOwnerAccess(channel, userId, allowView) {
  await channel.permissionOverwrites.edit(channel.guild.id, {
    ViewChannel: false
  });
  if (allowView) {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      EmbedLinks: true,
      AttachFiles: true,
      AddReactions: true,
      UseExternalEmojis: true,
      UseExternalStickers: true,
      CreatePublicThreads: true,
      CreatePrivateThreads: true,
      SendMessagesInThreads: true,
      ManageMessages: true,
      ManageThreads: true,
      ManageChannels: true
    });
  } else {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: false
    });
  }
}

export async function revokeBlogAccess(guild, userId, reason = 'Subscriber / boost ended') {
  const record = getUserBlog(userId);
  if (!record) return false;

  const channel = guild.channels.cache.get(record.channel_id)
    ?? await guild.channels.fetch(record.channel_id).catch(() => null);

  if (!channel) {
    removeUserBlog(userId);
    console.log(`[BLOG] Channel missing for ${userId} — cleared DB record.`);
    return false;
  }

  try {
    await applyOwnerAccess(channel, userId, false);
    await channel.setTopic(`Locked — ${reason}. Re-boost or resubscribe, then use .x blog to reopen.`).catch(() => {});
    console.log(`[BLOG] Locked ${channel.name} for user ${userId}`);
    return true;
  } catch (err) {
    console.error(`[BLOG LOCK ERROR] ${userId}`, err);
    return false;
  }
}

export async function restoreBlogAccess(guild, userId) {
  const record = getUserBlog(userId);
  if (!record) return null;

  const channel = guild.channels.cache.get(record.channel_id)
    ?? await guild.channels.fetch(record.channel_id).catch(() => null);

  if (!channel) {
    removeUserBlog(userId);
    return null;
  }

  await applyOwnerAccess(channel, userId, true);
  return channel;
}

async function handleCreate(message) {
  const member = message.member;
  if (!member) return message.reply('Could not load your member info.');

  if (!canHaveBlog(member)) {
    return message.reply('Blogs are for **server boosters** and **subscribers** only.');
  }

  const existing = getUserBlog(member.id);
  if (existing) {
    const channel = message.guild.channels.cache.get(existing.channel_id)
      ?? await message.guild.channels.fetch(existing.channel_id).catch(() => null);

    if (channel) {
      await applyOwnerAccess(channel, member.id, true);
      return message.reply(`You already have a blog: ${channel}`);
    }

    removeUserBlog(member.id);
  }

  const category = findBlogCategory(message.guild);
  if (!category) {
    return message.reply(
      'No blogs category is set. Ask a staff member to create a category named **Blogs** (or put its ID in `config.json` as `blogCategoryId`).'
    );
  }

  const channelName = `blog-${sanitizeName(member.user.username)}`;

  try {
    const channel = await message.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `${member.user.username}'s blog`,
      permissionOverwrites: ownerOverwrites(message.guild, member.id, message.client.user.id, true),
      reason: `Blog created for ${member.user.tag}`
    });

    setUserBlog(member.id, channel.id);
    await channel.send(
      `${member} this is your blog. You can post, pin, and manage this channel while you boost or stay subscribed.`
    );
    return message.reply(`Created your blog: ${channel}`);
  } catch (err) {
    console.error('[BLOG CREATE ERROR]', err);
    return message.reply('Could not create the channel. Make sure the bot has **Manage Channels** and can see the Blogs category.');
  }
}

async function handleAssign(message, args) {
  if (!isStaff(message.member)) {
    return message.reply('Only staff can assign existing blog channels.');
  }

  const target = message.mentions.members.first()
    ?? await message.guild.members.fetch(args[1]).catch(() => null);

  const channel = message.mentions.channels.first()
    ?? message.guild.channels.cache.get(args[2]);

  if (!target || !channel || channel.type !== ChannelType.GuildText) {
    return message.reply('Usage: `.x blog assign @user #channel`');
  }

  const takenByUser = getUserBlog(target.id);
  if (takenByUser && takenByUser.channel_id !== channel.id) {
    return message.reply(`That user is already linked to <#${takenByUser.channel_id}>. Unassign it first.`);
  }

  const takenByChannel = getBlogByChannel(channel.id);
  if (takenByChannel && takenByChannel.user_id !== target.id) {
    return message.reply(`That channel is already linked to <@${takenByChannel.user_id}>. Unassign it first.`);
  }

  try {
    await applyOwnerAccess(channel, target.id, canHaveBlog(target));
    setUserBlog(target.id, channel.id);
    return message.reply(
      `Linked ${channel} to ${target}.${canHaveBlog(target) ? '' : ' They do not currently boost/subscribe, so the channel is locked until they do.'}`
    );
  } catch (err) {
    console.error('[BLOG ASSIGN ERROR]', err);
    return message.reply('Could not update channel permissions.');
  }
}

async function handleUnassign(message, args) {
  if (!isStaff(message.member)) {
    return message.reply('Only staff can unassign blog channels.');
  }

  const target = message.mentions.members.first()
    ?? (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);

  const channel = message.mentions.channels.first()
    ?? message.guild.channels.cache.get(args[1]);

  let record = null;
  if (target) record = getUserBlog(target.id);
  else if (channel) record = getBlogByChannel(channel.id);

  if (!record) {
    return message.reply('Usage: `.x blog unassign @user` or `.x blog unassign #channel`');
  }

  removeUserBlog(record.user_id);
  return message.reply(`Unlinked blog <#${record.channel_id}> from <@${record.user_id}>. The channel itself was not deleted.`);
}

async function handleList(message) {
  if (!isStaff(message.member)) {
    return message.reply('Only staff can list all blogs.');
  }

  const rows = getAllBlogs();
  if (!rows.length) return message.reply('No blogs are linked yet.');

  const lines = rows.map(r => `<@${r.user_id}> → <#${r.channel_id}>`);
  const chunks = [];
  let current = '**Linked blogs**\n';
  for (const line of lines) {
    if (current.length + line.length + 1 > 1900) {
      chunks.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current) chunks.push(current);
  for (const chunk of chunks) await message.reply(chunk);
}

export default {
  name: 'blog',
  description: 'Create or manage a subscriber / booster blog channel',
  async execute(message, args) {
    if (!message.guild) return message.reply('Use this command in the server.');

    const sub = args[0]?.toLowerCase();

    if (!sub) return handleCreate(message);
    if (sub === 'assign') return handleAssign(message, args);
    if (sub === 'unassign' || sub === 'remove') return handleUnassign(message, args);
    if (sub === 'list') return handleList(message);

    return message.reply(
      [
        '**Blog commands**',
        '`.x blog` — create your blog (boosters / subscribers)',
        '`.x blog assign @user #channel` — staff: link an existing channel',
        '`.x blog unassign @user` — staff: unlink without deleting',
        '`.x blog list` — staff: show all linked blogs'
      ].join('\n')
    );
  }
};