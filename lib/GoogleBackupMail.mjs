import path from 'path';

import fse from 'fs-extra';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';

export default class GoogleBackupMail {

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
    username = null,
    password = null,
    imapHost = null,
    imapPort = null,
    imapTLS = true,
    imapTLSOptions = null,
    batchSize = null,
  }) {
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
      // await this.downloadBox({
      //   boxId: `[Gmail]/${boxAllId}`,
      //   pathMail: path.resolve(path.join('mail', 'Received')),
      // });

      // Download all Sent e-mails
      await this.downloadBox({
        boxId: `[Gmail]/${boxSentId}`,
        pathMail: path.resolve(path.join('mail', 'Sent')),
      });
    } finally {
      if (this.imapClient) {
        await this.imapClient.end();
      }
    }
  }

  async downloadBox({
    boxId = null,
    pathMail = null,
  }) {
    await fse.ensureDir(pathMail);

    let lastUid = await fse.readdir(pathMail)
      .then(files => {
        const uids = files
          .filter(file => file.endsWith('.eml'))
          .map(file => Number.parseInt(file));

        if (uids.length === 0) {
          return 0;
        }

        return Math.max(...uids);
      });

    try {
      await this.imapClient.openBox(boxId);
      this.log(`✅ Opened ${boxId}`);

      // Download all remaining e-mails
      while (true) {
        const fetchOptions = {
          bodies: [''],
          markSeen: false,
        };

        const start = lastUid + 1;
        const end = lastUid + this.batchSize;

        // Search for new messages
        const messages = await this.imapClient.search([['UID', `${start}:${end}`]], fetchOptions);

        // If no remaining messages, break the loop
        if (Object.keys(messages).length === 0) break;

        // For eveyr message, save it
        for (const message of Object.values(messages)) {
          try {
            // Parse mail body
            const body = message.parts.map(part => part.body).join('');
            const mail = await simpleParser(body);

            const pathMailFile = path.join(pathMail, `${message.attributes.uid}.eml`);

            // Write .eml file
            await fse.writeFile(pathMailFile, body);

            // Set file modified date to the message's date
            await fse.utimes(pathMailFile, new Date(), mail.date);

            // Log to Console
            this.log(`✅ #${message.attributes.uid} — ${mail.date.toISOString()} — ${mail.subject ?? '(No Subject)'}`);
          } catch (err) {
            this.log(`❌ #${message.attributes.uid} — ${err.message}`);
          } finally {
            // Set new lastUid
            if (message.attributes.uid > lastUid) {
              lastUid = message.attributes.uid;
            }
          }
        }
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