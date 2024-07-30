#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

import { program } from 'commander';
import GoogleBackup from '../lib/GoogleBackup.mjs';

// Get Version from package.json
const { version } = JSON.parse(await fs.promises.readFile(new URL('../package.json', import.meta.url)));

program
  .version(version)
  .option('-u, --username', 'Google Username', process.env.GOOGLE_BACKUP_USERNAME)
  .option('-p, --password', 'Google App Password', process.env.GOOGLE_BACKUP_PASSWORD)
  .option('-f, --filepath', 'Backup Filepath', process.env.GOOGLE_BACKUP_FILEPATH)
  .option('-s, --services <services>', 'Services to backup', value => {
    return value.split(',').map(value => value.trim());
  }, ['mail', 'calendar', 'contacts'],
  )
  .parse();

const options = program.opts();

const googleBackup = new GoogleBackup({
  username: options.username,
  password: options.password,
  filepath: path.resolve(options.filepath),
});

await Promise.all([
  options.services.includes('mail') && googleBackup.backupMail(),
  options.services.includes('calendar') && googleBackup.backupCalendar(),
  options.services.includes('contacts') && googleBackup.backupContacts(),
]);