#!/usr/bin/env node
// Saves a safe copy of the shop database and keeps the newest 30. Run it from a daily cron job.
//   DATABASE_URL   (same as the app uses)
//   BACKUP_DIR     optional; defaults to a "shop-backups" folder next to the database folder
//
// VACUUM INTO makes a consistent snapshot even while the shop is busy (a plain file copy might not).

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const match = /^file:(.+?)(\?.*)?$/.exec(process.env.DATABASE_URL || "");
if (!match) throw new Error("DATABASE_URL is missing or wrong.");
const file = path.resolve(match[1]);

const backupDir = path.resolve(process.env.BACKUP_DIR || path.join(path.dirname(file), "..", "shop-backups"));
fs.mkdirSync(backupDir, { recursive: true });

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const target = path.join(backupDir, `shop-${stamp}.db`);

const db = new DatabaseSync(file, { readOnly: true });
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();
console.log(`Backup saved: ${target}`);

const old = fs
  .readdirSync(backupDir)
  .filter((f) => /^shop-\d{8}-\d{6}\.db$/.test(f))
  .sort()
  .reverse()
  .slice(30);
for (const f of old) fs.unlinkSync(path.join(backupDir, f));
if (old.length) console.log(`Removed ${old.length} old backup(s).`);
