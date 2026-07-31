import { 
  getUserPokedex, 
  addToPokedex, 
  getBattleCooldown, 
  setBattleCooldown,
  addUserXats,
  db
} from '../db.js';

const activePokemon = new Map();
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

function getTrainerSprite(key) {
  return `https://play.pokemonshowdown.com/sprites/trainers/${key}.png`;
}

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
        attempted: new Set()
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

    // ====================== BATTLE (with 1 hour cooldown) ======================
    if (subCommand === 'battle') {
      const pokemonName = args[1]
        ? args[1].charAt(0).toUpperCase() + args[1].slice(1).toLowerCase()
        : null;

      if (!pokemonName) {
        return message.reply('Usage: `.x poke battle <pokemonname>`');
      }

      const dex = getUserPokedex(userId);
      const owned = dex.get(pokemonName);
      if (!owned) return message.reply(`You don't own **${pokemonName}**!`);

      const lastBattle = getBattleCooldown(userId);
      const cooldown = 3600000; // 1 hour

      if (Date.now() - lastBattle < cooldown) {
        const timeLeft = Math.ceil((cooldown - (Date.now() - lastBattle)) / 60000);
        return message.reply(`⏳ You can battle again in **${timeLeft} minutes**.`);
      }

      // 10% chance Team Rocket steals the Pokémon
      if (Math.random() < 0.10) {
        db.prepare('DELETE FROM user_pokedex WHERE user_id = ? AND pokemon_name = ?')
          .run(userId, pokemonName);

        const isFemale = Math.random() < 0.5;
        const gruntSprite = isFemale
          ? 'https://play.pokemonshowdown.com/sprites/trainers/rocketgruntf.png'
          : 'https://play.pokemonshowdown.com/sprites/trainers/rocketgrunt.png';

        await message.channel.send({
          content: `🚀 **Uh oh! Team Rocket stole ${pokemonName}!**`,
          embeds: [{
            color: 0x000000,
            description: 'Looks like Team Rocket is up to no good again...',
            image: { url: gruntSprite }
          }]
        });
        return;
      }

      // Large curated trainer list
      const trainers = [
        // Gen 1
        { key: 'red', name: 'Red' },
        { key: 'blue', name: 'Blue' },
        { key: 'brock', name: 'Brock' },
        { key: 'misty', name: 'Misty' },
        { key: 'lt-surge', name: 'Lt. Surge' },
        { key: 'erika', name: 'Erika' },
        { key: 'koga', name: 'Koga' },
        { key: 'sabrina', name: 'Sabrina' },
        { key: 'blaine', name: 'Blaine' },
        { key: 'giovanni', name: 'Giovanni' },
        { key: 'lorelei', name: 'Lorelei' },
        { key: 'bruno', name: 'Bruno' },
        { key: 'agatha', name: 'Agatha' },
        { key: 'lance', name: 'Lance' },

        // Gen 2
        { key: 'silver', name: 'Silver' },
        { key: 'will', name: 'Will' },
        { key: 'karen', name: 'Karen' },
        { key: 'clair', name: 'Clair' },
        { key: 'chuck', name: 'Chuck' },
        { key: 'jasmine', name: 'Jasmine' },
        { key: 'pryce', name: 'Pryce' },
        { key: 'morty', name: 'Morty' },
        { key: 'falkner', name: 'Falkner' },
        { key: 'bugsy', name: 'Bugsy' },
        { key: 'whitney', name: 'Whitney' },

        // Gen 3
        { key: 'may', name: 'May' },
        { key: 'brendan', name: 'Brendan' },
        { key: 'roxanne', name: 'Roxanne' },
        { key: 'brawly', name: 'Brawly' },
        { key: 'wattson', name: 'Wattson' },
        { key: 'flannery', name: 'Flannery' },
        { key: 'norman', name: 'Norman' },
        { key: 'winona', name: 'Winona' },
        { key: 'tate', name: 'Tate' },
        { key: 'liza', name: 'Liza' },
        { key: 'wallace', name: 'Wallace' },
        { key: 'steven', name: 'Steven' },
        { key: 'archie', name: 'Archie' },
        { key: 'maxie', name: 'Maxie' },
        { key: 'sidney', name: 'Sidney' },
        { key: 'phoebe', name: 'Phoebe' },
        { key: 'glacia', name: 'Glacia' },
        { key: 'drake', name: 'Drake' },

        // Gen 4
        { key: 'cynthia', name: 'Cynthia' },
        { key: 'fantina', name: 'Fantina' },
        { key: 'byron', name: 'Byron' },
        { key: 'candice', name: 'Candice' },
        { key: 'volkner', name: 'Volkner' },
        { key: 'aaron', name: 'Aaron' },
        { key: 'bertha', name: 'Bertha' },
        { key: 'flint', name: 'Flint' },
        { key: 'lucian', name: 'Lucian' },
        { key: 'gardenia', name: 'Gardenia' },
        { key: 'maylene', name: 'Maylene' },
        { key: 'crasherwake', name: 'Crasher Wake' },
        { key: 'roark', name: 'Roark' },

        // Gen 5
        { key: 'n', name: 'N' },
        { key: 'ghetsis', name: 'Ghetsis' },
        { key: 'alder', name: 'Alder' },
        { key: 'iris', name: 'Iris' },
        { key: 'lenora', name: 'Lenora' },
        { key: 'burgh', name: 'Burgh' },
        { key: 'elesa', name: 'Elesa' },
        { key: 'clay', name: 'Clay' },
        { key: 'skyla', name: 'Skyla' },
        { key: 'drayden', name: 'Drayden' },
        { key: 'marshal', name: 'Marshal' },
        { key: 'grimsley', name: 'Grimsley' },
        { key: 'caitlin', name: 'Caitlin' },
        { key: 'shauntal', name: 'Shauntal' },
        { key: 'chili', name: 'Chili' },
        { key: 'cilan', name: 'Cilan' },
        { key: 'cress', name: 'Cress' },

        // Gen 6
        { key: 'diantha', name: 'Diantha' },
        { key: 'olympia', name: 'Olympia' },
        { key: 'wikstrom', name: 'Wikstrom' },
        { key: 'drasna', name: 'Drasna' },
        { key: 'malva', name: 'Malva' },
        { key: 'lysandre', name: 'Lysandre' },
        { key: 'grant', name: 'Grant' },
        { key: 'korrina', name: 'Korrina' },
        { key: 'ramos', name: 'Ramos' },
        { key: 'clemont', name: 'Clemont' },
        { key: 'valerie', name: 'Valerie' },

        // Gen 7
        { key: 'kukui', name: 'Kukui' },
        { key: 'nanu', name: 'Nanu' },
        { key: 'hapu', name: 'Hapu' },
        { key: 'olivia', name: 'Olivia' },
        { key: 'kahili', name: 'Kahili' },
        { key: 'molayne', name: 'Molayne' },
        { key: 'acerola', name: 'Acerola' },
        { key: 'guzma', name: 'Guzma' },
        { key: 'lusamine', name: 'Lusamine' },
        { key: 'gladion', name: 'Gladion' },
        { key: 'lillie', name: 'Lillie' },
        { key: 'hau', name: 'Hau' },

        // Gen 8
        { key: 'leon', name: 'Leon' },
        { key: 'hop', name: 'Hop' },
        { key: 'marnie', name: 'Marnie' },
        { key: 'bede', name: 'Bede' },
        { key: 'raihan', name: 'Raihan' },
        { key: 'milo', name: 'Milo' },
        { key: 'nessa', name: 'Nessa' },
        { key: 'kabu', name: 'Kabu' },
        { key: 'bea', name: 'Bea' },
        { key: 'allister', name: 'Allister' },
        { key: 'opal', name: 'Opal' },
        { key: 'gordie', name: 'Gordie' },
        { key: 'melony', name: 'Melony' },
        { key: 'piers', name: 'Piers' },

        // Gen 9
        { key: 'nemona', name: 'Nemona' },
        { key: 'penny', name: 'Penny' },
        { key: 'arven', name: 'Arven' },
        { key: 'geeta', name: 'Geeta' },
        { key: 'larry', name: 'Larry' },
        { key: 'ryme', name: 'Ryme' },
        { key: 'tulip', name: 'Tulip' },
        { key: 'grusha', name: 'Grusha' },
        { key: 'iono', name: 'Iono' },
        { key: 'katy', name: 'Katy' },
        { key: 'brassius', name: 'Brassius' },
        { key: 'kofu', name: 'Kofu' },
        { key: 'poppy', name: 'Poppy' },
        { key: 'rika', name: 'Rika' },
        { key: 'hassel', name: 'Hassel' },

        // Team Rocket / Villains
        { key: 'rocketgrunt', name: 'Team Rocket Grunt' },
        { key: 'rocketgruntf', name: 'Team Rocket Grunt' },
        { key: 'proton', name: 'Proton' },
        { key: 'petrel', name: 'Petrel' },
        { key: 'ariana', name: 'Ariana' },
        { key: 'archer', name: 'Archer' },
      ];

      const trainer = trainers[Math.floor(Math.random() * trainers.length)];
      const enemyId = Math.floor(Math.random() * 151) + 1;
      const enemy = await getPokemonData(enemyId);

      const embed = {
        color: 0xFF0000,
        title: `⚔️ Battle vs ${trainer.name}!`,
        description: `You sent out **${pokemonName}**!\nOpponent sent out **${enemy.name}**!`,
        thumbnail: { url: getSpriteUrl(owned.id) },
        image: { url: getTrainerSprite(trainer.key) }
      };

      await message.channel.send({ embeds: [embed] });

      setTimeout(async () => {
        const win = Math.random() < 0.55;
        const amount = 10 + Math.floor(Math.random() * 41);

        if (win) {
          addUserXats(userId, amount);
          await message.channel.send(
            `🎉 **Victory!** ${pokemonName} defeated ${enemy.name}! You earned **${amount} xats**!`
          );
        } else {
          addUserXats(userId, -amount);
          await message.channel.send(`💥 Defeat... You lost **${amount} xats**!`);
        }

        setBattleCooldown(userId);
      }, 2200);

      return;
    }

    // ====================== DEX ======================
    if (subCommand === 'dex' || subCommand === 'pokedex') {
      const dexMap = getUserPokedex(userId);
      if (dexMap.size === 0) return message.reply('🦒 Your Pokédex is empty!');

      const entries = Array.from(dexMap.entries());
      const itemsPerPage = 20;
      const page = parseInt(args[1]) || 1;
      const totalPages = Math.ceil(entries.length / itemsPerPage);
      const start = (page - 1) * itemsPerPage;

      const description = entries
        .slice(start, start + itemsPerPage)
        .map(([name, data]) =>
          `• ${name} ${data.count > 1 ? `**x${data.count}**` : ''} ${data.shiny ? '✨' : ''}`
        )
        .join('\n');

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

    // Help
    message.reply(
      `**Pokémon Commands:**\n` +
      `• .x poke spawn (admin only)\n` +
      `• .x poke battle <pokemonname>\n` +
      `• .x poke dex [page]`
    );
  }
};

// ====================== REACTION CATCHING ======================
export function setupPokemonReactions(client) {
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.emoji.id !== '1520136245710164180') return;

    const active = activePokemon.get('current');
    if (!active || active.messageId !== reaction.message.id) return;

    // Already tried → completely ignore
    if (active.attempted.has(user.id)) return;
    active.attempted.add(user.id);

    const success = Math.random() * 100 < active.catchDifficulty;

    if (success) {
      // Race condition guard – make sure nobody else just claimed it
      const stillActive = activePokemon.get('current');
      if (!stillActive || stillActive.spawnTime !== active.spawnTime) {
        return;
      }

      // Claim it immediately so no one else can succeed
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
    attempted: new Set()
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