const pokeBalls = new Map();
const userPokedex = new Map();

const activePokemon = new Map();
const pokemonNameCache = new Map();

const pokeShopItems = [
  { name: 'basic', display: 'Poké Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png', catchRate: 40 },
  { name: 'great', display: 'Great Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png', catchRate: 60 },
  { name: 'ultra', display: 'Ultra Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png', catchRate: 80 },
  { name: 'premier', display: 'Premier Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/premier-ball.png', catchRate: 50 },
  { name: 'heal', display: 'Heal Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/heal-ball.png', catchRate: 45 },
  { name: 'quick', display: 'Quick Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/quick-ball.png', catchRate: 70 },
  { name: 'dusk', display: 'Dusk Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/dusk-ball.png', catchRate: 65 },
  { name: 'timer', display: 'Timer Ball', price: 0, sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/timer-ball.png', catchRate: 55 }
];

async function getPokemonData(id) {
  if (pokemonNameCache.has(id)) return pokemonNameCache.get(id);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await res.json();
    const pokemon = { name: data.name.charAt(0).toUpperCase() + data.name.slice(1), id };
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
    'Red': 'red',
    'Blue': 'blue',
    'Giovanni': 'giovanni',
    'Misty': 'misty',
    'Brock': 'brock',
    'Lt. Surge': 'lt-surge',
    'Erika': 'erika',
    'Koga': 'koga',
    'Sabrina': 'sabrina',
    'Blaine': 'blaine'
  };
  let key = trainerMap[trainer] || trainer.toLowerCase().replace(/ /g, '-');
  return `https://play.pokemonshowdown.com/sprites/trainers/${key}.png`;
}

function getUserBalls(userId) {
  if (!pokeBalls.has(userId)) {
    pokeBalls.set(userId, { basic: 0, great: 0, ultra: 0, premier: 0, heal: 0, quick: 0, dusk: 0, timer: 0 });
  }
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
      if (!message.member.permissions.has('Administrator')) {
        return message.reply('❌ Admin only for spawn!');
      }
      if (activePokemon.has('current')) activePokemon.delete('current');

      const id = Math.floor(Math.random() * 151) + 1;
      const pokemon = await getPokemonData(id);
      const isShiny = Math.random() < 0.02;
      const difficulty = 25 + Math.floor(Math.random() * 60);

      const pokemonData = { ...pokemon, difficulty, isShiny, spawnTime: Date.now() };
      activePokemon.set('current', pokemonData);

      const embed = {
        color: isShiny ? 0xFFD700 : 0xFFAA00,
        title: isShiny ? '✨ A shiny Pokémon appeared!' : '🐾 A wild Pokémon appeared!',
        description: `**Wild ${pokemon.name}** appeared!${isShiny ? ' ✨' : ''}\nCatch chance ≈ **${difficulty}%**`,
        thumbnail: { url: getSpriteUrl(pokemon.id, isShiny) }
      };

      const spawnMsg = await message.channel.send({ embeds: [embed] });

      if (Math.random() < 0.08) {
        setTimeout(() => {
          const stolen = 10 + Math.floor(Math.random() * 91);
          spawnMsg.reply(`😠 **${pokemon.name} rebelled!** Stole **${stolen} xats**! (debug)`);
        }, 8000);
      }

      setTimeout(() => {
        if (activePokemon.get('current')?.spawnTime === pokemonData.spawnTime) {
          activePokemon.delete('current');
          spawnMsg.reply('💨 Ran away!');
        }
      }, 30000);
      return;
    }

    if (subCommand === 'catch') {
      const active = activePokemon.get('current');
      if (!active) return message.reply('No wild Pokémon!');

      const balls = getUserBalls(userId);
      let ballType = (args[1] || 'basic').toLowerCase();
      if (!balls[ballType] || balls[ballType] <= 0) {
        return message.reply(`No ${ballType} balls!`);
      }

      balls[ballType]--;

      const ballInfo = pokeShopItems.find(b => b.name === ballType) || pokeShopItems[0];
      const adjusted = Math.min(95, active.difficulty + (ballInfo.catchRate - 40));

      const roll = Math.random() * 100;
      const success = roll < adjusted;

      if (success) {
        const dex = getUserDex(userId);
        const count = (dex.get(active.name)?.count || 0) + 1;
        dex.set(active.name, { id: active.id, count, shiny: active.isShiny });

        const shinyText = active.isShiny ? ' ✨ **SHINY!**' : '';
        await message.channel.send({
          content: `🎉 Caught **${active.name}**${shinyText} (x${count}) with ${ballInfo.display}!`,
          embeds: [{ color: active.isShiny ? 0xFFD700 : 0x00ff00, thumbnail: { url: getSpriteUrl(active.id, active.isShiny) } }]
        });
        activePokemon.delete('current');
      } else {
        await message.channel.send(`💥 Broke free!`);
      }
      return;
    }

    // BATTLE with possible Team Rocket steal
    if (subCommand === 'battle') {
      const pokemonName = args[1] ? args[1].charAt(0).toUpperCase() + args[1].slice(1).toLowerCase() : null;
      if (!pokemonName) return message.reply('Usage: `.x poke battle <pokemonname>`');

      const dex = getUserDex(userId);
      const owned = dex.get(pokemonName);
      if (!owned) return message.reply(`You don't own **${pokemonName}**!`);

      // Team Rocket steal chance BEFORE battle
      if (Math.random() < 0.25) { // 25% chance
        dex.delete(pokemonName);
        await message.channel.send({
          content: `🚀 **Uh oh! Team Rocket stole ${pokemonName}!**`,
          embeds: [{ 
            color: 0x000000,
            description: "Looks like Team Rocket is up to no good again...",
            image: { url: "https://play.pokemonshowdown.com/sprites/trainers/team-rocket.png" }
          }]
        });
        return;
      }

      // Normal battle if no steal
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
          await message.channel.send({
            content: `🎉 **Victory!** ${pokemonName} defeated ${enemy.name}!`,
            embeds: [{ color: 0x00ff00, description: `You earned **${rewardXats} xats**! (debug)` }]
          });
        } else {
          const lostXats = 15 + Math.floor(Math.random() * 60);
          await message.channel.send(`💥 Defeat... You lost **${lostXats} xats**! (debug)`);
        }
      }, 2200);
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
      if (!item) return message.reply('Use a valid ball type (see .x poke shop)');

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

    message.reply(`**Pokémon Commands:**\n` +
      `• .x poke spawn (admin)\n` +
      `• .x poke catch [balltype]\n` +
      `• .x poke battle <pokemon>\n` +
      `• .x poke shop\n` +
      `• .x poke buy <type>\n` +
      `• .x poke dex [page]`);
  }
};