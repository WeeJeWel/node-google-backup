import { DAVClient } from 'tsdav';

export default class GoogleBackupCalendar {

  filepath = null;
  davClient = null;
  davConfig = {
    serverUrl: 'https://apidata.googleusercontent.com/caldav/v2/',
    credentials: {
      username: null,
      password: null,
    },
    authMethod: 'Basic',
    defaultAccountType: 'carddav',
  }

  constructor({
    filepath = null,
    username = null,
    password = null,
  }) {
    this.filepath = filepath
    this.davConfig.credentials.username = username;
    this.davConfig.credentials.password = password;

    this.davClient = new DAVClient(this.davConfig);
  }

  async createBackup() {
    await client.login();
  }

}