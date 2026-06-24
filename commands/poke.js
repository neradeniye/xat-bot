const pokeBalls = new Map();
const userPokedex = new Map(); // name -> {id, count}

const activePokemon = new Map();

const pokeShopItems = [ /* same as before */ ];

function getSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getUserBalls(userId) { /* same */ }

function getUserDex(userId) {
  if (!userPokedex.has(userId)) userPokedex.set(userId, new Map());
  return userPokedex.get(userId);
}

export default {
  name: 'poke',
  execute: async (message, args) => {
    const subCommand = args[0]?.toLowerCase();
    const userId = message.author.id;

    if (subCommand === 'spawn') {
      const id = Math.floor(Math.random() * 151) + 1; // 1-151 classic
      const name = await getPokemonName(id); // simple fetch

      const difficulty = 30 + Math.floor(Math.random() * 50);
      const pokemonData = { name, id, difficulty, spawnTime: Date.now() };
      activePokemon.set('current', pokemonData);

      const embed = {
        color: 0xFFAA00,
        title: '🐾 A wild Pokémon appeared!',
        description: `**Wild ${name}** appeared!\nCatch chance: **${difficulty}%**`,
        thumbnail: { url: getSpriteUrl(id) }
      };

      const spawnMsg = await message.channel.send({ embeds: [embed] });

      setTimeout(() => {
        if (activePokemon.get('current')?.spawnTime === pokemonData.spawnTime) {
          activePokemon.delete('current');
          spawnMsg.reply('💨 Ran away!');
        }
      }, 30000);
      return;
    }

    // ... (catch, shop, buy, dex remain similar - catch now saves dynamic name/id)

    if (subCommand === 'dex' || subCommand === 'pokedex') {
      // pagination code as before, using saved names
    }

    // Help...
  }
};

// Helper to get name (cached if possible)
const pokemonNameCache = new Map();
async function getPokemonName(id) {
  if (pokemonNameCache.has(id)) return pokemonNameCache.get(id);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await res.json();
    const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
    pokemonNameCache.set(id, name);
    return name;
  } catch {
    return `Pokémon #${id}`;
  }
}