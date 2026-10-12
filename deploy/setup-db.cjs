#!/usr/bin/env node
// Creates (or updates) the shop's database and the login accounts. Safe to run again after an update:
// it only applies database changes it hasn't applied yet, and only touches the three login accounts.
//
// Reads these settings from the environment (set them in cPanel's Node.js app, never in a file):
//   DATABASE_URL                       e.g. file:/home/USER/shop-data/shop.db?connection_limit=1
//   OWNER1_USERNAME / OWNER1_PASSWORD / OWNER1_DISPLAY_NAME
//   OWNER2_USERNAME / OWNER2_PASSWORD / OWNER2_DISPLAY_NAME
//   CASHIER_USERNAME / CASHIER_PASSWORD / CASHIER_DISPLAY_NAME   (optional)
//
// Uses Node's built-in SQLite, so it needs no extra tools on the server (Node 22 or newer).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

function databaseFile() {
  const match = /^file:(.+?)(\?.*)?$/.exec(process.env.DATABASE_URL || "");
  if (!match) {
    throw new Error("DATABASE_URL is missing or wrong. It should look like file:/home/USER/shop-data/shop.db");
  }
  return path.resolve(match[1]);
}

const file = databaseFile();
fs.mkdirSync(path.dirname(file), { recursive: true });
const existed = fs.existsSync(file);
const db = new DatabaseSync(file);

// 1. Database structure: apply each migration folder once, in order.
db.exec('CREATE TABLE IF NOT EXISTS "_setup_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL)');

const done = new Set(db.prepare('SELECT name FROM "_setup_migrations"').all().map((r) => r.name));
// A database that was built by Prisma on another computer already has these migrations.
const hasPrismaTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
if (hasPrismaTable) {
  for (const r of db.prepare('SELECT migration_name AS name FROM "_prisma_migrations"').all()) done.add(r.name);
}

const migrationsDir = path.join(__dirname, "migrations");
const pending = fs
  .readdirSync(migrationsDir)
  .filter((d) => fs.existsSync(path.join(migrationsDir, d, "migration.sql")))
  .sort()
  .filter((d) => !done.has(d));

if (pending.length > 0 && existed && done.size > 0) {
  const backup = `${file}.before-update-${Date.now()}`;
  fs.copyFileSync(file, backup);
  console.log(`Saved a copy of the existing database first: ${backup}`);
}

for (const name of pending) {
  console.log(`Applying database change: ${name}`);
  db.exec(fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8"));
  db.prepare('INSERT INTO "_setup_migrations" ("name", "appliedAt") VALUES (?, ?)').run(name, new Date().toISOString());
}
console.log(pending.length === 0 ? "Database structure is already up to date." : "Database structure is up to date.");

// 2. Login accounts.
const accounts = [
  { role: "OWNER", prefix: "OWNER1", fallbackName: "Owner 1", required: true },
  { role: "OWNER", prefix: "OWNER2", fallbackName: "Owner 2", required: true },
  { role: "CASHIER", prefix: "CASHIER", fallbackName: "Cashier", required: false },
];

for (const a of accounts) {
  const username = process.env[`${a.prefix}_USERNAME`];
  const password = process.env[`${a.prefix}_PASSWORD`];
  const displayName = process.env[`${a.prefix}_DISPLAY_NAME`] || a.fallbackName;

  if (!username || !password) {
    if (a.required) throw new Error(`Set ${a.prefix}_USERNAME and ${a.prefix}_PASSWORD first.`);
    console.log(`Skipping ${a.role.toLowerCase()} account (${a.prefix}_USERNAME / ${a.prefix}_PASSWORD not set).`);
    continue;
  }
  if (password.length < 8) throw new Error(`${a.prefix}_PASSWORD is too short. Use at least 8 characters.`);

  db.prepare(
    `INSERT INTO "User" ("id", "username", "passwordHash", "displayName", "role", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT("username") DO UPDATE SET
       "passwordHash" = excluded."passwordHash", "displayName" = excluded."displayName", "role" = excluded."role"`
  ).run("c" + crypto.randomBytes(12).toString("hex"), username, bcrypt.hashSync(password, 10), displayName, a.role, Date.now());
  console.log(`Account ready: ${username} (${a.role.toLowerCase()})`);
}

if ((process.env.SESSION_SECRET || "").length < 32) {
  console.log("WARNING: SESSION_SECRET is missing or shorter than 32 characters. Set a long random one before using the site.");
}

db.close();
console.log("Done.");
