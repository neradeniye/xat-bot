import { getUserBalance } from '../db.js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const { xatEmoji } = config;

export default {
  name: 'balance',
  execute(message) {
    const target = message.mentions.users.first() || message.author;
    const balance = getUserBalance(target.id);

    const descriptor = target.id === message.author.id ? 'You have' : 'They have';
    message.reply(`${descriptor} ${balance} ${xatEmoji} xats.`);
  }
};