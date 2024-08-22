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
    this.filepathByID = path.join(this.filepath, 'By ID');
    this.filepathByLabel = path.join(this.filepath, 'By Label');
    this.filepathByThread = path.join(this.filepath, 'By Thread');

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
    await fse.ensureDir(this.filepathByID);
    await fse.ensureDir(this.filepathByLabel);
    await fse.ensureDir(this.filepathByThread);

    try {
      // Connect to IMAP Server
      this.imapClient = await imap.connect(this.imapConfig);
      this.log(`✅ Connected to ${this.imapConfig.imap.host}:${this.imapConfig.imap.port}`);

      // Get Gmail Mailboxes
      const boxes = await this.imapClient.getBoxes();

      // Download all mailboxes recursively
      const downloadBoxesRecursive = async (boxes, parents = []) => {
        for (const [boxId, box] of Object.entries(boxes)) {
          if (box.children) {
            await downloadBoxesRecursive(box.children, [boxId, ...parents]);
          }

          if (box.attribs.includes('\\Noselect')) {
            this.log(`⏩ Skipping Box ${boxId}`);
            continue;
          }

          await this.downloadBox({
            boxPath: [...parents.reverse(), boxId],
          }).catch(err => {
            this.log(`❌ Error downloading Box ${boxId}: ${err.message}`);
          });
        }
      }

      await downloadBoxesRecursive(boxes);
    } finally {
      if (this.imapClient) {
        await this.imapClient.end();
      }
    }
  }

  async downloadBox({
    boxPath = null,
  }) {
    const boxId = boxPath.join('/');
    const boxFilepathByLabel = path.join(this.filepathByLabel, ...boxPath);

    // Create directory for the box
    await fse.ensureDir(boxFilepathByLabel);

    // Get the latest downloaded UID
    const latestUid = await fse.readdir(boxFilepathByLabel)
      .then(files => {
        let latestUid = 0;

        files
          .filter(file => file.endsWith('.eml'))
          .map(file => Number.parseInt(file))
          .forEach(uid => {
            if (uid > latestUid) {
              latestUid = uid;
            }
          });

        return latestUid;
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
      if (newest.length === 0) return;

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

            const messageId = String(message.attributes['x-gm-msgid']);
            const threadId = String(message.attributes['x-gm-thrid']);
            const filepathFileById = path.join(this.filepathByID, `${messageId}.eml`);
            const filepathLinkByLabel = path.join(boxFilepathByLabel, `${message.attributes.uid}.eml`);
            const filepathLinkByThread = path.join(this.filepathByThread, threadId, `${messageId}.eml`);

            // Write .eml file (if it doesn't exist yet)
            if (await fse.pathExists(filepathFileById) === false) {
              await fse.writeFile(filepathFileById, body);

              // Set file modified date to the message's date
              await fse.utimes(filepathFileById, new Date(), mail.date);
            }

            // Link from 'By Label'
            if (await fse.pathExists(filepathLinkByLabel) === false) {
              await fse.symlink(filepathFileById, filepathLinkByLabel);
            }

            // Link from 'By Thread'
            if (threadId) {
              await fse.ensureDir(path.join(this.filepathByThread, threadId));
              if (await fse.pathExists(filepathLinkByThread) === false) {
                await fse.symlink(filepathFileById, filepathLinkByThread);
              }
            }

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