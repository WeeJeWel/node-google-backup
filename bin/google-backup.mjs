#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { program } from 'commander';
import GoogleBackup from '../lib/GoogleBackup.mjs';

// Get Version from package.json
const { version } = JSON.parse(await fs.promises.readFile(new URL('../package.json', import.meta.url)));

program
  .version(version)
  .option('-u, --username <username>', 'Google Username')
  .option('-p, --password <password>', 'Google App Password')
  .option('-f, --filepath <filepath>', 'Backup Filepath')
  .option('-s, --services <services>', 'Services to backup', value => {
    return value.split(',').map(value => value.trim());
  }, ['mail', 'calendar', 'contacts'],
  )
  .parse();

const options = program.opts();

const googleBackup = new GoogleBackup({
  username: options.username ?? process.env.GOOGLE_BACKUP_USERNAME,
  password: options.password ?? process.env.GOOGLE_BACKUP_PASSWORD,
  filepath: options.filepath ?? process.env.GOOGLE_BACKUP_FILEPATH,
});

await Promise.all([
  options.services.includes('mail') && googleBackup.backupMail(),
  options.services.includes('calendar') && googleBackup.backupCalendar(),
  options.services.includes('contacts') && googleBackup.backupContacts(),
]);