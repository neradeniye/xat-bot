import { 
  getUserPokedex, 
  addToPokedex, 
  getBattleCooldown, 
  setBattleCooldown,
  addUserXats,
  db                    // ← added (needed for the Team Rocket steal)
} from '../db.js';

const activePokemon = new Map();
const pokemonNameCache = new Map();

// ... keep getPokemonData, getSpriteUrl, getTrainerSprite exactly as they are ...

export default {
  name: 'poke',
  execute: async (message, args) => {
    const subCommand = args[0]?.toLowerCase();
    const userId = message.author.id;

    // ====================== SPAWN (Admin manual spawn) ======================
    if (subCommand === 'spawn') {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Admin only for spawn!');
      }

      if (activePokemon.has('current')) activePokemon.delete('current');

      const id = Math.floor(Math.random() * 151) + 1;
      const pokemon = await getPokemonData(id);
      const isShiny = Math.random() < 0.03;
      const catchDifficulty = 35 + Math.floor(Math.random() * 50);

      const pokemonData = { 
        ...pokemon, 
        isShiny, 
        catchDifficulty, 
        spawnTime: Date.now(),
        messageId: null,
        attempted: new Set()          // ← NEW
      };

      activePokemon.set('current', pokemonData);

      const embed = {
        color: isShiny ? 0xFFD700 : 0xFFAA00,
        title: isShiny ? '✨ A shiny Pokémon appeared!' : '🐾 A wild Pokémon appeared!',
        description: `**${pokemon.name}** has appeared!\n\nReact with <:pb:1520136245710164180> to try catching it!`,
        thumbnail: { url: getSpriteUrl(pokemon.id, isShiny) },
        footer: { text: `Catch chance ≈ ${catchDifficulty}% • 45 seconds` }
      };

      const spawnMsg = await message.channel.send({ embeds: [embed] });
      pokemonData.messageId = spawnMsg.id;

      await spawnMsg.react('1520136245710164180');

      setTimeout(() => {
        if (activePokemon.get('current')?.spawnTime === pokemonData.spawnTime) {
          activePokemon.delete('current');
          spawnMsg.reply('💨 The wild Pokémon ran away!');
        }
      }, 45000);

      return;
    }

    // ====================== BATTLE ======================
    // (unchanged except the db import above)

    // ====================== DEX ======================
    // (unchanged)

    message.reply(`**Pokémon Commands:**\n` +
      `• .x poke spawn (admin only)\n` +
      `• .x poke battle <pokemonname>\n` +
      `• .x poke dex [page]`);
  }
};

// ====================== REACTION CATCHING ======================
export function setupPokemonReactions(client) {
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.emoji.id !== '1520136245710164180') return;

    const active = activePokemon.get('current');
    if (!active || active.messageId !== reaction.message.id) return;

    // Already tried → ignore completely
    if (active.attempted.has(user.id)) return;
    active.attempted.add(user.id);

    const success = Math.random() * 100 < active.catchDifficulty;

    if (success) {
      // Race-condition guard – make sure nobody else just claimed it
      const stillActive = activePokemon.get('current');
      if (!stillActive || stillActive.spawnTime !== active.spawnTime) {
        // Someone else already got it while we were calculating
        return;
      }

      // Claim it immediately so nobody else can succeed
      activePokemon.delete('current');

      addToPokedex(user.id, active.name, active.id, active.isShiny);

      const dex = getUserPokedex(user.id);
      const count = dex.get(active.name).count;
      const shinyText = active.isShiny ? ' ✨ **SHINY!**' : '';

      await reaction.message.channel.send({
        content: `🎉 **${user.username}** caught **${active.name}**${shinyText} (x${count})!`,
        embeds: [{
          color: active.isShiny ? 0xFFD700 : 0x00ff00,
          thumbnail: { url: getSpriteUrl(active.id, active.isShiny) }
        }]
      });
    } else {
      // Fail – this user is done, others can still try
      await reaction.message.channel.send(
        `💥 **${user.username}** failed to catch **${active.name}**!`
      );
      reaction.users.remove(user.id).catch(() => {});
    }
  });
}

// ====================== AUTO-SPAWN ======================
export async function spawnPokemon(channel) {
  if (!channel) return;

  const id = Math.floor(Math.random() * 151) + 1;
  const pokemon = await getPokemonData(id);
  const isShiny = Math.random() < 0.03;
  const catchDifficulty = 35 + Math.floor(Math.random() * 50);

  const pokemonData = { 
    ...pokemon, 
    isShiny, 
    catchDifficulty, 
    spawnTime: Date.now(),
    messageId: null,
    attempted: new Set()          // ← NEW
  };

  activePokemon.set('current', pokemonData);

  const embed = {
    color: isShiny ? 0xFFD700 : 0xFFAA00,
    title: isShiny ? '✨ A shiny Pokémon appeared!' : '🐾 A wild Pokémon appeared!',
    description: `**${pokemon.name}** has appeared!\n\nReact with <:pb:1520136245710164180> to try catching it!`,
    thumbnail: { url: getSpriteUrl(pokemon.id, isShiny) },
    footer: { text: `Catch chance ≈ ${catchDifficulty}% • 45 seconds` }
  };

  const spawnMsg = await channel.send({ embeds: [embed] });
  pokemonData.messageId = spawnMsg.id;

  await spawnMsg.react('1520136245710164180');

  setTimeout(() => {
    if (activePokemon.get('current')?.spawnTime === pokemonData.spawnTime) {
      activePokemon.delete('current');
      spawnMsg.reply('💨 The wild Pokémon ran away!');
    }
  }, 45000);
}