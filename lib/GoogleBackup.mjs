import GoogleBackupMail from './GoogleBackupMail.mjs';
import GoogleBackupCalendar from './GoogleBackupCalendar.mjs';
import GoogleBackupContacts from './GoogleBackupContacts.mjs';

export default class GoogleBackup {

  constructor({
    username = null,
    password = null,
  }) {
    if (!username) {
      throw new Error('Missing Username');
    }

    if (!password) {
      throw new Error('Missing Password');
    }

    this.mail = new GoogleBackupMail({
      username,
      password,
    });

    this.calendar = new GoogleBackupCalendar({
      username,
      password,
    });

    this.contacts = new GoogleBackupContacts({
      username,
      password,
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