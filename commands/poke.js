const pokeBalls = new Map(); // userId -> count (debug in-memory)

const activePokemon = new Map(); // For global active wild pokemon

const pokemonList = [
  { 
    name: 'Pikachu', 
    id: 25, 
    difficulty: 40, 
    emoji: '⚡' 
  },
  { 
    name: 'Charmander', 
    id: 4, 
    difficulty: 35, 
    emoji: '🔥' 
  },
  { 
    name: 'Bulbasaur', 
    id: 1, 
    difficulty: 35, 
    emoji: '🌱' 
  },
  { 
    name: 'Squirtle', 
    id: 7, 
    difficulty: 35, 
    emoji: '💧' 
  },
  // Add more later
];

function getSpriteUrl(pokemonId) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

export default {
  name: 'poke',
  description: 'Pokémon debug commands',
  execute: async (message, args, client) => {
    const subCommand = args[0]?.toLowerCase();
    const userId = message.author.id;

    if (subCommand === 'spawn') {
      // Clear any existing active pokemon
      if (activePokemon.has('current')) {
        activePokemon.delete('current');
      }

      const pokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
      const catchChance = pokemon.difficulty;
      
      const pokemonData = { ...pokemon, catchChance, spawnTime: Date.now() };
      activePokemon.set('current', pokemonData);
      
      const embed = {
        color: 0xFFAA00,
        title: '🐾 A wild Pokémon appeared!',
        description: `${pokemon.emoji} **Wild ${pokemon.name}** appeared!\n\nCatch chance with basic Poké Ball: **${catchChance}%**`,
        thumbnail: { url: getSpriteUrl(pokemon.id) },
        footer: { text: 'Use .x poke catch | Expires soon!' }
      };
      
      const spawnMsg = await message.channel.send({ embeds: [embed] });
      
      // Auto-despawn after 30 seconds
      setTimeout(() => {
        if (activePokemon.has('current') && activePokemon.get('current').spawnTime === pokemonData.spawnTime) {
          activePokemon.delete('current');
          spawnMsg.reply('💨 The wild Pokémon ran away!');
          console.log(`[POKE DEBUG] ${pokemon.name} despawned`);
        }
      }, 30000);
      
      console.log(`[POKE DEBUG] Spawned ${pokemon.name}`);
      return;
    }

    if (subCommand === 'catch') {
      const active = activePokemon.get('current');
      if (!active) {
        return message.reply('No wild Pokémon right now! Spawn one with `.x poke spawn`');
      }

      let balls = pokeBalls.get(userId) || 0;
      if (balls <= 0) {
        return message.reply('You have no Poké Balls! Use `.x poke add basic 5` for debug.');
      }

      pokeBalls.set(userId, balls - 1);

      const roll = Math.random() * 100;
      const success = roll < active.catchChance;

      if (success) {
        await message.channel.send({
          content: `🎉 **Gotcha!** You caught the **${active.name}**!`,
          embeds: [{
            color: 0x00ff00,
            description: `(${Math.floor(roll)}/${active.catchChance})`,
            thumbnail: { url: getSpriteUrl(active.id) }
          }]
        });
        activePokemon.delete('current');
      } else {
        await message.channel.send(`💥 The **${active.name}** broke free! (${Math.floor(roll)}/${active.catchChance})`);
      }
      return;
    }

    if (subCommand === 'add') {
      const type = args[1]?.toLowerCase();
      const amount = parseInt(args[2]) || 5;
      if (type === 'basic') {
        let current = pokeBalls.get(userId) || 0;
        pokeBalls.set(userId, current + amount);
        return message.reply(`✅ Added ${amount} basic Poké Balls. You now have **${current + amount}**.`);
      }
      return message.reply('Usage: `.x poke add basic <amount>`');
    }

    if (subCommand === 'dex' || subCommand === 'pokedex') {
      return message.reply('🦒 **Pokédex** (debug mode): No Pokémon caught yet.\nCatch some with `.x poke catch`!');
    }

    // Help
    message.reply(`**Pokémon Debug Commands:**\n` +
      `• \`.x poke spawn\` — Spawn a wild Pokémon (30s timer)\n` +
      `• \`.x poke catch\` — Try to catch the current one\n` +
      `• \`.x poke add basic <num>\` — Give yourself balls\n` +
      `• \`.x poke dex\` — View pokedex (placeholder)`);
  }
};