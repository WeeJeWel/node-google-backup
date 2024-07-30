import path from 'path';

import GoogleBackupMail from './GoogleBackupMail.mjs';
import GoogleBackupCalendar from './GoogleBackupCalendar.mjs';
import GoogleBackupContacts from './GoogleBackupContacts.mjs';

export default class GoogleBackup {

  constructor({
    username = null,
    password = null,
    filepath = null,
  }) {
    if (!username) {
      throw new Error('Missing Username');
    }

    if (!password) {
      throw new Error('Missing Password');
    }

    if (!filepath) {
      throw new Error('Missing Filepath');
    }

    if (filepath.startsWith('~/')) {
      filepath = path.join(process.env.HOME, filepath.slice(2));
    }

    filepath = path.resolve(filepath);

    this.mail = new GoogleBackupMail({
      username,
      password,
      filepath: path.join(filepath, 'mail'),
    });

    this.calendar = new GoogleBackupCalendar({
      username,
      password,
      filepath: path.join(filepath, 'calendar'),
    });

    this.contacts = new GoogleBackupContacts({
      username,
      password,
      filepath: path.join(filepath, 'contacts'),
    });
  }

  async backupAll() {
    await Promise.all([
      this.backupMail(),
      this.backupCalendar(),
      this.backupContacts(),
    ]);
  }

  async backupMail() {
    await this.mail.createBackup();
  }

  async backupCalendar() {
    await this.calendar.createBackup();
  }

  async backupContacts() {
    await this.contacts.createBackup();
  }

}