const activePokemon = new Map();
const userPokedex = new Map();
const pokemonNameCache = new Map();

async function getPokemonData(id) {
  if (pokemonNameCache.has(id)) return pokemonNameCache.get(id);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await res.json();
    const pokemon = { 
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1), 
      id 
    };
    pokemonNameCache.set(id, pokemon);
    return pokemon;
  } catch {
    return { name: `Unknown #${id}`, id };
  }
}

function getSpriteUrl(id, isShiny = false) {
  const base = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/`;
  return isShiny ? `${base}shiny/${id}.png` : `${base}${id}.png`;
}

function getTrainerSprite(trainer) {
  const trainerMap = {
    'Red': 'red', 'Blue': 'blue', 'Giovanni': 'giovanni', 'Misty': 'misty',
    'Brock': 'brock', 'Lt. Surge': 'lt-surge', 'Erika': 'erika', 'Koga': 'koga',
    'Sabrina': 'sabrina', 'Blaine': 'blaine'
  };
  let key = trainerMap[trainer] || trainer.toLowerCase().replace(/ /g, '-');
  return `https://play.pokemonshowdown.com/sprites/trainers/${key}.png`;
}

function getUserDex(userId) {
  if (!userPokedex.has(userId)) userPokedex.set(userId, new Map());
  return userPokedex.get(userId);
}

export default {
  name: 'poke',
  execute: async (message, args) => {
    const subCommand = args[0]?.toLowerCase();
    const userId = message.author.id;

    // ====================== SPAWN ======================
    if (subCommand === 'spawn') {
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Admin only for spawn!');
      }

      if (activePokemon.has('current')) activePokemon.delete('current');

      const id = Math.floor(Math.random() * 151) + 1;
      const pokemon = await getPokemonData(id);
      const isShiny = Math.random() < 0.03; // 3% shiny chance
      const catchDifficulty = 35 + Math.floor(Math.random() * 50); // 35-85%

      const pokemonData = { 
        ...pokemon, 
        isShiny, 
        catchDifficulty, 
        spawnTime: Date.now(),
        messageId: null 
      };

      activePokemon.set('current', pokemonData);

      const embed = {
        color: isShiny ? 0xFFD700 : 0xFFAA00,
        title: isShiny ? '✨ A shiny Pokémon appeared!' : '🐾 A wild Pokémon appeared!',
        description: `**${pokemon.name}** has appeared!\n\nReact with ⚾ to try catching it!`,
        thumbnail: { url: getSpriteUrl(pokemon.id, isShiny) },
        footer: { text: `Catch chance ≈ ${catchDifficulty}% • 45 seconds` }
      };

      const spawnMsg = await message.channel.send({ embeds: [embed] });
      pokemonData.messageId = spawnMsg.id;

      await spawnMsg.react('⚾');

      // Auto despawn
      setTimeout(() => {
        if (activePokemon.get('current')?.spawnTime === pokemonData.spawnTime) {
          activePokemon.delete('current');
          spawnMsg.reply('💨 The wild Pokémon ran away!');
        }
      }, 45000);

      return;
    }

    // ====================== BATTLE ======================
    if (subCommand === 'battle') {
      const pokemonName = args[1] ? args[1].charAt(0).toUpperCase() + args[1].slice(1).toLowerCase() : null;
      if (!pokemonName) return message.reply('Usage: `.x poke battle <pokemonname>`');

      const dex = getUserDex(userId);
      const owned = dex.get(pokemonName);
      if (!owned) return message.reply(`You don't own **${pokemonName}**!`);

      // Team Rocket steal chance
      if (Math.random() < 0.10) {
        dex.delete(pokemonName);
        
        const isFemale = Math.random() < 0.5;
        const gruntSprite = isFemale 
          ? "https://play.pokemonshowdown.com/sprites/trainers/rocketgruntf.png"
          : "https://play.pokemonshowdown.com/sprites/trainers/rocketgrunt.png";

        await message.channel.send({
          content: `🚀 **Uh oh! Team Rocket stole ${pokemonName}!**`,
          embeds: [{ 
            color: 0x000000,
            description: "Looks like Team Rocket is up to no good again...",
            image: { url: gruntSprite }
          }]
        });
        return;
      }

      // Normal battle
      const trainers = ['Red', 'Blue', 'Giovanni', 'Misty', 'Brock', 'Lt. Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine'];
      const trainer = trainers[Math.floor(Math.random() * trainers.length)];
      const enemyId = Math.floor(Math.random() * 151) + 1;
      const enemy = await getPokemonData(enemyId);

      const embed = {
        color: 0xFF0000,
        title: `⚔️ Battle vs ${trainer}!`,
        description: `You sent out **${pokemonName}**!\nOpponent sent out **${enemy.name}**!`,
        thumbnail: { url: getSpriteUrl(owned.id) },
        image: { url: getTrainerSprite(trainer) }
      };
      await message.channel.send({ embeds: [embed] });

      setTimeout(async () => {
        const win = Math.random() < 0.55;
        if (win) {
          const rewardXats = 30 + Math.floor(Math.random() * 70);
          await message.channel.send(`🎉 **Victory!** ${pokemonName} defeated ${enemy.name}! You earned **${rewardXats} xats**!`);
        } else {
          const lostXats = 15 + Math.floor(Math.random() * 60);
          await message.channel.send(`💥 Defeat... You lost **${lostXats} xats**!`);
        }
      }, 2200);
      return;
    }

    // ====================== DEX ======================
    if (subCommand === 'dex' || subCommand === 'pokedex') {
      const dexMap = getUserDex(userId);
      if (dexMap.size === 0) return message.reply('🦒 Your Pokédex is empty!');

      const entries = Array.from(dexMap.entries());
      const itemsPerPage = 20;
      const page = parseInt(args[1]) || 1;
      const totalPages = Math.ceil(entries.length / itemsPerPage);
      const start = (page - 1) * itemsPerPage;

      const description = entries.slice(start, start + itemsPerPage)
        .map(([name, data]) => 
          `• ${name} ${data.count > 1 ? `**x${data.count}**` : ''} ${data.shiny ? '✨' : ''}`
        ).join('\n');

      await message.channel.send({
        embeds: [{
          color: 0x00AAFF,
          title: `🦒 Pokédex (${dexMap.size} species)`,
          description,
          footer: { text: `Page ${page}/${totalPages}` }
        }]
      });
      return;
    }

    // Default help
    message.reply(`**Pokémon Commands:**\n` +
      `• .x poke spawn (admin only)\n` +
      `• .x poke battle <pokemonname>\n` +
      `• .x poke dex [page]`);
  }
};

// ====================== REACTION CATCHING ======================
export function setupPokemonReactions(client) {
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot || reaction.emoji.name !== '⚾') return;

    const active = activePokemon.get('current');
    if (!active || active.messageId !== reaction.message.id) return;

    // Prevent multiple attempts from same user at once
    if (active.lastReactor === user.id) return;

    active.lastReactor = user.id;

    const dex = getUserDex(user.id);
    const roll = Math.random() * 100;
    const success = roll < active.catchDifficulty;

    if (success) {
      const count = (dex.get(active.name)?.count || 0) + 1;
      dex.set(active.name, { id: active.id, count, shiny: active.isShiny });

      const shinyText = active.isShiny ? ' ✨ **SHINY!**' : '';

      await reaction.message.channel.send({
        content: `🎉 **${user.username}** caught **${active.name}**${shinyText}!`,
        embeds: [{
          color: active.isShiny ? 0xFFD700 : 0x00ff00,
          thumbnail: { url: getSpriteUrl(active.id, active.isShiny) }
        }]
      });

      activePokemon.delete('current');
    } else {
      await reaction.message.channel.send(`💥 **${user.username}** failed to catch **${active.name}**!`);
      reaction.users.remove(user.id).catch(() => {});
    }
  });
}