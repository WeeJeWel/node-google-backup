#!/usr/bin/env node

import fs from 'fs';

import { program } from 'commander';
import GoogleBackup from '../lib/GoogleBackup.mjs';

// Get Version from package.json
const { version } = JSON.parse(await fs.promises.readFile(new URL('../package.json', import.meta.url)));

program
  .version(version)
  .option('-u, --username <username>', 'Google Username')
  .option('-p, --password <password>', 'Google App Password')
  .option('-f, --filepath <filepath>', 'Backup Filepath')
  .option('-s, --services <services>', 'Services to backup. Defaults to mail,calendar,contacts')
  .parse();

const options = program.opts();

const optionUsername = options.username ?? process.env.GOOGLE_BACKUP_USERNAME;
const optionPassword = options.password ?? process.env.GOOGLE_BACKUP_PASSWORD;
const optionFilepath = options.filepath ?? process.env.GOOGLE_BACKUP_FILEPATH;
const optionServices = (options.services ?? process.env.GOOGLE_BACKUP_SERVICES ?? 'mail,calendar,contacts').split(',').map(service => service.trim());

const googleBackup = new GoogleBackup({
  username: optionUsername,
  password: optionPassword,
  filepath: optionFilepath,
});

await Promise.all([
  optionServices.includes('mail') && googleBackup.backupMail(),
  optionServices.includes('calendar') && googleBackup.backupCalendar(),
  optionServices.includes('contacts') && googleBackup.backupContacts(),
]);