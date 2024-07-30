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

```bash
$ npx -y google-backup --username "john.doe@gmail.com" --password "abcd efgh ijkl mnop" --filepath "~/Backups/Google/"
```

> Hint: You can schedule this in a cronjob for automated backups.