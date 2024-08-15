import path from 'path';

import fse from 'fs-extra';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';

export default class GoogleBackupMail {

  filepath = null;
  imapClient = null;
  imapConfig = {
    imap: {
      user: null,
      password: null,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false,
      },
    },
  };
  batchSize = 100;

  constructor({
    filepath = null,
    username = null,
    password = null,
    imapHost = null,
    imapPort = null,
    imapTLS = true,
    imapTLSOptions = null,
    batchSize = null,
  }) {
    this.filepath = filepath;
    this.imapConfig.imap.user = username;
    this.imapConfig.imap.password = password;
    this.imapConfig.imap.host = imapHost ?? this.imapConfig.imap.host;
    this.imapConfig.imap.port = imapPort ?? this.imapConfig.imap.port;
    this.imapConfig.imap.tls = imapTLS ?? this.imapConfig.imap.tls;
    this.imapConfig.imap.tlsOptions = imapTLSOptions ?? this.imapConfig.imap.tlsOptions;
    this.batchSize = batchSize ?? this.batchSize;
  }

  log(...args) {
    console.log(`[${this.constructor.name}]`, ...args);
  }

  async createBackup() {
    try {
      // Connect to IMAP Server
      this.imapClient = await imap.connect(this.imapConfig);
      this.log(`✅ Connected to ${this.imapConfig.imap.host}:${this.imapConfig.imap.port}`);

      // Get Gmail Mailboxes
      const boxes = await this.imapClient.getBoxes();
      const boxGmail = boxes['[Gmail]'];
      if (!boxGmail) {
        throw new Error('Missing Gmail Box');
      }

      const boxAllId = Object.keys(boxGmail.children).find(boxId => {
        const box = boxGmail.children[boxId];
        return box.special_use_attrib === '\\All';
      });

      if (!boxAllId) {
        throw new Error('Missing Gmail All Box');
      }

      const boxSentId = Object.keys(boxGmail.children).find(boxId => {
        const box = boxGmail.children[boxId];
        return box.special_use_attrib === '\\Sent';
      });

      if (!boxSentId) {
        throw new Error('Missing Gmail Sent Box');
      }

      // Download all Received e-mails
      await this.downloadBox({
        boxId: `[Gmail]/${boxAllId}`,
        filepath: path.join(this.filepath, 'received'),
      });

      // Download all Sent e-mails
      await this.downloadBox({
        boxId: `[Gmail]/${boxSentId}`,
        filepath: path.join(this.filepath, 'sent'),
      });
    } finally {
      if (this.imapClient) {
        await this.imapClient.end();
      }
    }
  }

  async downloadBox({
    boxId = null,
    filepath = null,
  }) {
    await fse.ensureDir(filepath);

    // Get the latest downloaded UID
    const latestUid = await fse.readdir(filepath)
      .then(files => {
        const uids = files
          .filter(file => file.endsWith('.eml'))
          .map(file => Number.parseInt(file));

        if (uids.length === 0) {
          return 0;
        }

        uids.sort((a, b) => b - a);
        return uids[0];
      });

    this.log(`🗄️ Latest UID: ${latestUid}`);

    try {
      await this.imapClient.openBox(boxId);
      this.log(`✅ Opened ${boxId}`);

      // Get the newest UID
      const newest = await this.imapClient.search([['UID', '*']], {
        bodies: [''],
        markSeen: false,
      });
      const newestUid = newest[0].attributes.uid;
      this.log(`✨ Newest UID: ${newestUid}`);

      // Download all remaining e-mails
      let offsetUid = latestUid;
      while (offsetUid < newestUid) {
        const fetchOptions = {
          bodies: [''],
          markSeen: false,
        };

        const start = offsetUid + 1;
        const end = offsetUid + this.batchSize;

        // Search for new messages
        this.log(`🔍 Searching for messages from ${start} — ${end}`);
        const messages = await this.imapClient.search([['UID', `${start}:${end}`]], fetchOptions);

        // For every message, save it
        for (const message of Object.values(messages)) {
          try {
            // Parse mail body
            const body = message.parts.map(part => part.body).join('');
            const mail = await simpleParser(body);

            const filepathFile = path.join(filepath, `${message.attributes.uid}.eml`);

            // Write .eml file
            await fse.writeFile(filepathFile, body);

            // Set file modified date to the message's date
            await fse.utimes(filepathFile, new Date(), mail.date);

            // Log to Console
            this.log(`✅ #${message.attributes.uid} — ${mail.date.toISOString()} — ${mail.subject ?? '(No Subject)'}`);
          } catch (err) {
            this.log(`❌ #${message.attributes.uid} — ${err.message}`);
          }
        }

        offsetUid = end;
      }
    } catch (err) {
      this.log(`❌ ${err.message}`);
      throw err;
    } finally {
      await this.imapClient.closeBox();
      this.log(`✅ Closed ${boxId}`);
    }

  }

}