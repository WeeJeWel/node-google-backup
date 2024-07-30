import GoogleBackup from './lib/GoogleBackup.mjs';

const googleBackup = new GoogleBackup({
  username: process.env.GOOGLE_USERNAME,
  password: process.env.GOOGLE_PASSWORD,
});
await googleBackup.backupAll();