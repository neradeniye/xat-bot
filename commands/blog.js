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

const BLOG_CATEGORY_ID = '1491791192470458502';
const SERVER_ACCESS_ROLE_ID = '1385720128708022395';
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
  const configured = config.blogCategoryId || BLOG_CATEGORY_ID;
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

export async function revokeBlogAccess(guild, userId, reason = 'Boost ended') {
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
    // Closed = server access role can no longer view the channel
    await channel.permissionOverwrites.edit(SERVER_ACCESS_ROLE_ID, {
      ViewChannel: false
    });
    await channel.setTopic(`Closed — ${reason}.`).catch(() => {});
    console.log(`[BLOG] Closed ${channel.name} for user ${userId}`);
    return true;
  } catch (err) {
    console.error(`[BLOG CLOSE ERROR] ${userId}`, err);
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
      return message.reply(`You already have a blog: ${channel}`);
    }

    removeUserBlog(member.id);
  }

  const category = findBlogCategory(message.guild);
  if (!category) {
    return message.reply(
      `Could not find the blogs category (\`${BLOG_CATEGORY_ID}\`). Make sure the bot can see it.`
    );
  }

  const channelName = `blog-${sanitizeName(member.user.username)}`;

  try {
    const channel = await message.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `${member.user.username}'s blog`,
      reason: `Blog created for ${member.user.tag}`
    });

    // Copy the category's permission overwrites onto this channel
    await channel.lockPermissions();

    // Give the owner permission to delete messages in their blog
    await channel.permissionOverwrites.edit(member.id, {
      ManageMessages: true
    });

    setUserBlog(member.id, channel.id);
    await channel.send(
      [
        `${member} this is your personal blog.`,
        '',
        '**Commands you can use:**',
        '`.x blog block @user` — hide this blog from someone',
        '`.x blog unblock @user` — let them see it again'
      ].join('\n')
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
    removeUserBlog(target.id);
  }

  const takenByChannel = getBlogByChannel(channel.id);
  if (takenByChannel && takenByChannel.user_id !== target.id) {
    removeUserBlog(takenByChannel.user_id);
    await channel.permissionOverwrites.delete(takenByChannel.user_id).catch(() => {});
  }

  try {
    await channel.permissionOverwrites.edit(target.id, {
      ManageMessages: true
    });
    setUserBlog(target.id, channel.id);

    if (!target.premiumSince) {
      await revokeBlogAccess(message.guild, target.id, 'Assigned user is not boosting');
      return message.reply(
        `Linked ${channel} to ${target}. They are not boosting, so the blog is closed (server access cannot view it).`
      );
    }

    return message.reply(`Linked ${channel} to ${target}.`);
  } catch (err) {
    console.error('[BLOG ASSIGN ERROR]', err);
    return message.reply('Could not update channel permissions.');
  }
}

async function handleBlock(message, args, block) {
  const member = message.member;
  if (!member) return message.reply('Could not load your member info.');

  if (!member.premiumSince) {
    return message.reply('You can only manage your blog while you are boosting.');
  }

  const record = getUserBlog(member.id);
  if (!record) return message.reply('You do not have a blog. Use `.x blog create` first.');

  const channel = message.guild.channels.cache.get(record.channel_id)
    ?? await message.guild.channels.fetch(record.channel_id).catch(() => null);
  if (!channel) {
    removeUserBlog(member.id);
    return message.reply('Your blog channel is missing. Ask staff to reassign or create a new one.');
  }

  const target = message.mentions.members.first()
    ?? (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);

  if (!target) {
    return message.reply(block ? 'Usage: `.x blog block @user`' : 'Usage: `.x blog unblock @user`');
  }
  if (target.id === member.id) return message.reply('You cannot block yourself.');
  if (target.user.bot) return message.reply('You cannot block bots.');

  try {
    if (block) {
      await channel.permissionOverwrites.edit(target.id, { ViewChannel: false });
      return message.reply(`Blocked ${target} from ${channel}.`);
    }
    await channel.permissionOverwrites.delete(target.id);
    return message.reply(`Unblocked ${target} from ${channel}.`);
  } catch (err) {
    console.error('[BLOG BLOCK ERROR]', err);
    return message.reply('Could not update that user\'s access.');
  }
}

async function handleClose(message) {
  let targetId = message.author.id;
  const mentioned = message.mentions.members?.first();

  if (mentioned) {
    if (!isStaff(message.member)) {
      return message.reply('Only staff can close someone else\'s blog.');
    }
    targetId = mentioned.id;
  }

  const record = getUserBlog(targetId);
  if (!record) return message.reply('No linked blog found.');

  const closed = await revokeBlogAccess(message.guild, targetId, 'Boost ended');
  if (closed) {
    return message.reply(`Closed the blog for <@${targetId}> — same as when boosting stops.`);
  }
  return message.reply('Could not close that blog.');
}

async function handleRefresh(message) {
  if (!isStaff(message.member)) {
    return message.reply('Only staff can refresh blogs.');
  }

  const rows = getAllBlogs();
  if (!rows.length) return message.reply('No blogs are linked yet.');

  await message.reply(`Refreshing **${rows.length}** blog(s)...`);

  let opened = 0;
  let closed = 0;
  const failures = [];

  for (const row of rows) {
    try {
      const channel = message.guild.channels.cache.get(row.channel_id)
        ?? await message.guild.channels.fetch(row.channel_id).catch(() => null);

      if (!channel) {
        failures.push(`<@${row.user_id}> — channel \`${row.channel_id}\` missing`);
        continue;
      }

      const member = await message.guild.members.fetch(row.user_id).catch(() => null);
      const isOpen = Boolean(member?.premiumSince);

      // Keep existing user blocks so a refresh does not unblock people
      const blocks = [];
      if (isOpen) {
        for (const overwrite of channel.permissionOverwrites.cache.values()) {
          if (overwrite.type !== 1) continue; // member overwrite
          if (overwrite.id === row.user_id) continue;
          if (overwrite.deny.has(PermissionFlagsBits.ViewChannel)) {
            blocks.push(overwrite.id);
          }
        }
      }

      await channel.lockPermissions();

      if (isOpen) {
        await channel.permissionOverwrites.edit(member.id, {
          ManageMessages: true
        });
        for (const userId of blocks) {
          await channel.permissionOverwrites.edit(userId, { ViewChannel: false });
        }
        await channel.setTopic(`${member.user.username}'s blog`).catch(() => {});
        opened++;
      } else {
        await channel.permissionOverwrites.edit(SERVER_ACCESS_ROLE_ID, {
          ViewChannel: false
        });
        await channel.setTopic('Closed — Boost ended.').catch(() => {});
        closed++;
      }
    } catch (err) {
      console.error(`[BLOG REFRESH ERROR] ${row.user_id}`, err);
      failures.push(`<@${row.user_id}> / <#${row.channel_id}> — ${err.message || err}`);
    }
  }

  const lines = [
    `Refresh done. **${opened}** open, **${closed}** closed, **${failures.length}** failed.`
  ];
  if (failures.length) {
    lines.push('', '**Failed**', ...failures.slice(0, 15));
    if (failures.length > 15) lines.push(`…and ${failures.length - 15} more`);
  }

  return message.reply(lines.join('\n'));
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

    if (sub === 'create') return handleCreate(message);
    if (sub === 'block') return handleBlock(message, args, true);
    if (sub === 'unblock') return handleBlock(message, args, false);
    if (sub === 'close') return handleClose(message);
    if (sub === 'refresh') return handleRefresh(message);
    if (sub === 'assign') return handleAssign(message, args);
    if (sub === 'unassign' || sub === 'remove') return handleUnassign(message, args);
    if (sub === 'list') return handleList(message);

    const lines = [
      '**Blog commands**',
      '`.x blog create` — create your blog',
      '`.x blog block @user` — hide your blog from someone',
      '`.x blog unblock @user` — let them see it again',
      '`.x blog close` — close your blog (same as boost ending)'
    ];

    if (isStaff(message.member)) {
      lines.push(
        '`.x blog assign @user #channel` — link or reassign a channel',
        '`.x blog unassign @user` — unlink without deleting',
        '`.x blog list` — show all linked blogs',
        '`.x blog refresh` — resync every blog to category permissions'
      );
    }

    return message.reply(lines.join('\n'));
  }
};