import path from 'path';

import fse from 'fs-extra';
import vCard from 'vcard-parser';
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
    await fse.ensureDir(this.filepath);
    await this.davClient.login();

    const addressBooks = await this.davClient.fetchAddressBooks();
    for (const addressBook of addressBooks) {
      const vcards = await this.davClient.fetchVCards({ addressBook });

      for (const vcard of vcards) {
        const uid = vcard.url.split('/').pop();

        try {
          // Parse vCard
          const vCardParsed = vCard.parse(vcard.data);
          let name = vCardParsed.fn?.[0]?.value;
          if (!name) name = vCardParsed.org?.[0]?.value;
          if (!name) name = vCardParsed.n?.[0]?.value;
          if (!name) name = vCardParsed.email?.[0]?.value;
          if (!name) name = '(Missing Name)';

          const etag = new Date(JSON.parse(vcard.etag));

          // Save vCard, but only if the file is newer than the last update
          const filepathFile = path.join(this.filepath, `${uid}.vcf`);

          // Skip if not modified
          const fileStats = await fse.stat(filepathFile).catch(() => null);
          if (fileStats && fileStats.mtime >= etag) continue;

          // Write .vcf file
          await fse.writeFile(filepathFile, vcard.data);
          await fse.utimes(filepathFile, new Date(), etag);

          console.log(`✅ ${uid} — ${name}`);
        } catch (err) {
          console.error(`❌ ${uid} — ${err.message}`);
        }
      }

    }

  }

}