import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '../backups');

 // Create backups folder if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getBackupPath(name) {
  return path.join(BACKUP_DIR, `${name}.db`);
}

export default {
  name: 'backup',
  async execute(message, args) {
    const sub = args[0]?.toLowerCase();
    const backupName = args[1];

    if (!sub) {
      return message.reply('**Backup Commands:**\n' +
        '• `.x backup save <name>`\n' +
        '• `.x backup load <name>`\n' +
        '• `.x backup delete <name>`\n' +
        '• `.x backup list`');
    }

    // Only allow admins / owners for safety
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ Only administrators can use backup commands.');
    }

    const dbPath = '/var/xat-bot-data/economy.db'; // ← Make sure this matches your db.js

    // ====================== LIST ======================
    if (sub === 'list') {
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'));
      if (files.length === 0) return message.reply('No backups found.');

      const list = files.map(f => `• ${f.replace('.db', '')}`).join('\n');
      return message.reply(`**Available Backups:**\n${list}`);
    }

    if (!backupName) {
      return message.reply('Please provide a backup name.');
    }

    const backupPath = getBackupPath(backupName);

    // ====================== SAVE ======================
    if (sub === 'save') {
      try {
        if (!fs.existsSync(dbPath)) {
          return message.reply('❌ Main database not found!');
        }

        fs.copyFileSync(dbPath, backupPath);
        return message.reply(`✅ Backup saved as **${backupName}**`);
      } catch (err) {
        console.error(err);
        return message.reply('❌ Failed to create backup.');
      }
    }

    // ====================== LOAD ======================
    if (sub === 'load') {
      if (!fs.existsSync(backupPath)) {
        return message.reply(`❌ Backup **${backupName}** not found.`);
      }

      try {
        // Optional: Create a quick backup of current state before overwriting
        const safetyBackup = getBackupPath(`pre-load-${Date.now()}`);
        fs.copyFileSync(dbPath, safetyBackup);

        fs.copyFileSync(backupPath, dbPath);
        return message.reply(`✅ Database restored from backup **${backupName}**.\nA safety backup was created just in case.`);
      } catch (err) {
        console.error(err);
        return message.reply('❌ Failed to restore backup.');
      }
    }

    // ====================== DELETE ======================
    if (sub === 'delete') {
      if (!fs.existsSync(backupPath)) {
        return message.reply(`❌ Backup **${backupName}** not found.`);
      }

      try {
        fs.unlinkSync(backupPath);
        return message.reply(`🗑️ Backup **${backupName}** deleted.`);
      } catch (err) {
        console.error(err);
        return message.reply('❌ Failed to delete backup.');
      }
    }

    message.reply('Unknown subcommand. Use `.x backup` for help.');
  }
};