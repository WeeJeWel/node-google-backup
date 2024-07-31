# Google Backup

This module automatically downloads your Google Mail, Contacts & Calendar to separate files. It'll sync only new Mails, Contacts & Events.

This tool will output the following directory structue:

```
.
├── contacts/
│   └── *.vcf
├── calendar/
│   └── *.ical
└── mail/
    ├── received/
    │   └── *.eml
    └── sent/
        └── *.eml
```

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
  --volume="/home/john/backups:/backups/" \
  ghcr.io/weejewel/google-backup
```
