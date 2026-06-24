import { giveUserItem, userOwnsItem, removeUserItem } from '../db.js';

const pokeBalls = new Map(); // userId -> count (debug in-memory)

const activePokemon = new Map(); // For global active wild pokemon (simple for now)

const pokemonList = [
  { name: 'Pikachu', difficulty: 40, emoji: '⚡' },
  { name: 'Charmander', difficulty: 35, emoji: '🔥' },
  { name: 'Bulbasaur', difficulty: 35, emoji: '🌱' },
  { name: 'Squirtle', difficulty: 35, emoji: '💧' },
];

export default {
  name: 'poke',
  description: 'Pokémon debug commands',
  execute: async (message, args, client) => {
    const subCommand = args[0]?.toLowerCase();
    const userId = message.author.id;

    if (subCommand === 'spawn') {
      // Fake spawn
      const pokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];
      const catchChance = pokemon.difficulty;
      
      activePokemon.set('current', { ...pokemon, catchChance });
      
      const embed = {
        color: 0x00ff00,
        title: '🐾 A wild Pokémon appeared!',
        description: `${pokemon.emoji} **Wild ${pokemon.name}** appeared!\n\nCatch chance with basic Poké Ball: **${catchChance}%**`,
        footer: { text: 'Use .x poke catch' }
      };
      
      await message.channel.send({ embeds: [embed] });
      console.log(`[POKE DEBUG] Spawned ${pokemon.name}`);
      return;
    }

    if (subCommand === 'catch') {
      const active = activePokemon.get('current');
      if (!active) {
        return message.reply('No wild Pokémon right now! Spawn one with .x poke spawn');
      }

      // Check balls - debug in-memory
      let balls = pokeBalls.get(userId) || 0;
      if (balls <= 0) {
        return message.reply('You have no Poké Balls! Use .x poke add basic 5 for debug.');
      }

      // Consume 1 ball
      pokeBalls.set(userId, balls - 1);

      const roll = Math.random() * 100;
      const success = roll < active.catchChance;

      if (success) {
        await message.channel.send(`🎉 **Gotcha!** You caught the **${active.name}**! (${Math.floor(roll)}/${active.catchChance})`);
        activePokemon.delete('current'); // Clear after catch
        // TODO: later add to collection
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
        return message.reply(`✅ Added ${amount} basic Poké Balls. You now have ${current + amount}.`);
      }
      return message.reply('Usage: .x poke add basic <amount>');
    }

    if (subCommand === 'dex' || subCommand === 'pokedex') {
      // Simple for now
      return message.reply('🦒 Pokédex (debug): No Pokémon caught yet. Catch some with .x poke catch!');
    }

    // Help
    message.reply(`**Pokémon Debug Commands:**\n` +
      `• .x poke spawn - Spawn a wild Pokémon\n` +
      `• .x poke catch - Try to catch current wild one\n` +
      `• .x poke add basic <num> - Give yourself balls\n` +
      `• .x poke dex - View pokedex (placeholder)`);
  }
};