# Google Backup

[![NPM Version](https://img.shields.io/npm/v/google-backup)](https://npmjs.com/package/google-backup)
[![Sponsor](https://img.shields.io/github/sponsors/weejewel)](https://github.com/sponsors/WeeJeWel)
[![Build & Publish NPM Package](https://github.com/WeeJeWel/node-google-backup/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/WeeJeWel/node-google-backup/actions/workflows/npm-publish.yml)
[![Build & Publish Docker Image](https://github.com/WeeJeWel/node-google-backup/actions/workflows/ghcr-publish.yml/badge.svg)](https://github.com/WeeJeWel/node-google-backup/actions/workflows/ghcr-publish.yml)

This module automatically downloads your Google Mail, Contacts & Calendar to separate files. It'll sync only new Mails, Contacts & Events.

This tool will output the following directory structure:

```
.
├── Contacts
│   └── *.vcf
├── Calendar
│   └── *.ical
└── Mail
    ├── By ID
    │   └── *.eml
    ├── By Thread
    │   └── <...>
    │       └── *.eml
    └── By Label
        ├── <...>
        │   └── *.eml
        └── [Gmail]
            ├── All Mail
            │   └── *.eml
            ├── Sent
            │   └── *.eml
            └── <...>
                 └── *.eml
```

> Note: All e-mail files are symlinked to 'By ID/*.eml'.

## Why?

Google makes great services, but there are many horror stories of people locked out of their accounts. So be safe, and keep your data backed up!

## Usage

### 1. Create a Google App Password

Create a Google App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

### 2. Run

#### Node.js

If you have Node.js already installed, run:

```bash
$ npx -y google-backup \
  --username "john.doe@gmail.com" \
  --password "abcd efgh ijkl mnop" \
  --filepath "~/Backups/Google/"
```

> Hint: You can schedule this in a cronjob for automated backups.

#### Docker

If you prefer Docker, this is an example how to run: 

```bash
$ docker run \
  --env GOOGLE_BACKUP_USERNAME="john.doe@gmail.com" \
  --env GOOGLE_BACKUP_PASSWORD="abcd efgh ijkl mnop" \
  --env GOOGLE_BACKUP_FILEPATH="/backups" \
  --env GOOGLE_BACKUP_SERVICES="mail,calendar,contacts" \
  --volume="~/Backups/Google/:/backups/" \
  ghcr.io/weejewel/google-backup
```

## Also see

Looking to backup iCloud Drive in a similar way? See [iCloud Backup](https://github.com/WeeJeWel/node-icloud-backup).
