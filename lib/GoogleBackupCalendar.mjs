import path from 'path';
import crypto from 'crypto';

import fse from 'fs-extra';
import ical from 'node-ical';

export default class GoogleBackupCalendar {

  filepath = null;

  constructor({
    filepath = null,
    username = null,
    password = null,
  }) {
    this.filepath = filepath
    this.username = username;
    this.password = password;
  }

  async createBackup() {
    await fse.ensureDir(this.filepath);

    const res = await fetch(`https://www.google.com/calendar/dav/${this.username}/events`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`,
      },
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }

    const resText = await res.text();

    // Split events
    const events = resText.split('BEGIN:VEVENT');
    for (let event of events) {
      try {
        event = `BEGIN:VCALENDAR\nBEGIN:VEVENT${event}`;

        const calendarParsed = await ical.async.parseICS(event);

        const eventParsed = Object.values(calendarParsed)[0];
        if (eventParsed.type !== 'VEVENT') continue;

        const id = crypto.createHash('md5').update(eventParsed.uid).digest('hex');
        const dtstamp = eventParsed.lastmodified;
        const summary = eventParsed.summary;

        const filepathFile = path.join(this.filepath, `${id}.ics`);

        // Skip if not modified
        const fileStats = await fse.stat(filepathFile).catch(() => null);
        if (fileStats && fileStats.mtime >= dtstamp) continue;

        // Save iCal, but only if the file is newer than the last update
        await fse.writeFile(filepathFile, event);
        await fse.utimes(filepathFile, new Date(), dtstamp);

        console.log(`✅ ${id} — ${summary}`);
      } catch (err) {
        console.error(`❌ ${err.message}`);
      }
    }

  }

}