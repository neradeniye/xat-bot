const pokeBalls = new Map();
const userPokedex = new Map();

const activePokemon = new Map();
const pokemonNameCache = new Map();

const pokeShopItems = [
  { name: 'basic', display: 'Poké Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png', catchRate: 40 },
  { name: 'great', display: 'Great Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png', catchRate: 60 }
];

async function getPokemonData(id) {
  if (pokemonNameCache.has(id)) return pokemonNameCache.get(id);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await res.json();
    const pokemon = {
      name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
      id: id
    };
    pokemonNameCache.set(id, pokemon);
    return pokemon;
  } catch (e) {
    return { name: `Unknown #${id}`, id };
  }
}

function getSpriteUrl(id, isShiny = false) {
  const base = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/`;
  return isShiny ? `${base}shiny/${id}.png` : `${base}${id}.png`;
}

function getUserBalls(userId) {
  if (!pokeBalls.has(userId)) pokeBalls.set(userId, { basic: 0, great: 0 });
  return pokeBalls.get(userId);
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

    if (subCommand === 'spawn') {
      if (activePokemon.has('current')) activePokemon.delete('current');

      const id = Math.floor(Math.random() * 151) + 1;
      const pokemon = await getPokemonData(id);
      const isShiny = Math.random() < 0.02; // 2% shiny chance
      const difficulty = 25 + Math.floor(Math.random() * 60);

      const pokemonData = { ...pokemon, difficulty, isShiny, spawnTime: Date.now() };
      activePokemon.set('current', pokemonData);

      const embed = {
        color: isShiny ? 0xFFD700 : 0xFFAA00,
        title: isShiny ? '✨ A shiny Pokémon appeared!' : '🐾 A wild Pokémon appeared!',
        description: `**Wild ${pokemon.name}** appeared!${isShiny ? ' ✨' : ''}\nCatch chance ≈ **${difficulty}%**`,
        thumbnail: { url: getSpriteUrl(pokemon.id, isShiny) },
        footer: { text: 'Use .x poke catch' }
      };

      const spawnMsg = await message.channel.send({ embeds: [embed] });

      setTimeout(() => {
        if (activePokemon.get('current')?.spawnTime === pokemonData.spawnTime) {
          activePokemon.delete('current');
          spawnMsg.reply('💨 The wild Pokémon ran away!');
        }
      }, 30000);
      return;
    }

    if (subCommand === 'catch') {
      const active = activePokemon.get('current');
      if (!active) return message.reply('No wild Pokémon right now!');

      const balls = getUserBalls(userId);
      let ballType = (args[1] || 'basic').toLowerCase();
      if (!balls[ballType] || balls[ballType] <= 0) return message.reply(`No ${ballType} balls!`);

      balls[ballType]--;

      const ballInfo = pokeShopItems.find(b => b.name === ballType) || pokeShopItems[0];
      const adjusted = Math.min(95, active.difficulty + (ballInfo.catchRate - 40));

      const roll = Math.random() * 100;
      const success = roll < adjusted;

      if (success) {
        const dex = getUserDex(userId);
        const currentCount = (dex.get(active.name)?.count || 0) + 1;
        dex.set(active.name, { id: active.id, count: currentCount, shiny: active.isShiny });

        const shinyText = active.isShiny ? ' ✨ **SHINY!**' : '';
        await message.channel.send({
          content: `🎉 **Gotcha!** Caught **${active.name}**${shinyText} (x${currentCount})!`,
          embeds: [{ color: active.isShiny ? 0xFFD700 : 0x00ff00, thumbnail: { url: getSpriteUrl(active.id, active.isShiny) } }]
        });
        activePokemon.delete('current');
      } else {
        await message.channel.send(`💥 Broke free!`);
      }
      return;
    }

    if (subCommand === 'shop') {
      const embeds = pokeShopItems.map(item => ({
        color: 0xAA00FF,
        title: item.display,
        thumbnail: { url: item.sprite },
        description: `**Price:** ${item.price} xats\n**Catch Bonus:** +${item.catchRate-40}%`,
        footer: { text: `.x poke buy ${item.name}` }
      }));
      await message.channel.send({ embeds });
      return;
    }

    if (subCommand === 'buy') {
      const itemName = args[1]?.toLowerCase();
      const item = pokeShopItems.find(i => i.name === itemName);
      if (!item) return message.reply('basic or great');

      const balls = getUserBalls(userId);
      balls[item.name] = (balls[item.name] || 0) + 1;

      await message.channel.send({
        content: `✅ Bought 1 **${item.display}**!`,
        embeds: [{ thumbnail: { url: item.sprite }, description: `Now have **${balls[item.name]}**.` }]
      });
      return;
    }

    if (subCommand === 'dex' || subCommand === 'pokedex') {
      const dexMap = getUserDex(userId);
      if (dexMap.size === 0) return message.reply('🦒 Pokédex empty!');

      const entries = Array.from(dexMap.entries());
      const itemsPerPage = 50;
      const page = parseInt(args[1]) || 1;
      const totalPages = Math.ceil(entries.length / itemsPerPage);
      const currentPage = Math.max(1, Math.min(page, totalPages));

      const start = (currentPage - 1) * itemsPerPage;
      const pageEntries = entries.slice(start, start + itemsPerPage);

      const description = pageEntries.map(([name, data]) => 
        `• ${name} ${data.count > 1 ? `**x${data.count}**` : ''} ${data.shiny ? '✨' : ''}`
      ).join('\n');

      await message.channel.send({
        embeds: [{
          color: 0x00AAFF,
          title: `🦒 Pokédex (${dexMap.size} species)`,
          description,
          footer: { text: `Page ${currentPage}/${totalPages}` }
        }]
      });
      return;
    }

    message.reply(`**Commands:**\n` +
      `• .x poke spawn\n` +
      `• .x poke catch [basic/great]\n` +
      `• .x poke shop\n` +
      `• .x poke buy <type>\n` +
      `• .x poke dex [page]`);
  }
};