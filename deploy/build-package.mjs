// Builds the site on this computer and packs it into one zip to upload to cPanel hosting.
//
//   npm run package:cpanel                      full package for the usual cPanel Linux servers
//   npm run package:cpanel -- --targets=rhel-openssl-3.0.x     only the engine the server really needs (smaller)
//   npm run package:cpanel -- --local-test      keep the Windows engine so the package can be tried on this PC
//
// Why build here: the hosting only has 2 GB of memory, which is tight for building but fine for running.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist-cpanel");
const pkg = path.join(out, "shop-pos");

const args = process.argv.slice(2);
const localTest = args.includes("--local-test");
const targetsArg = args.find((a) => a.startsWith("--targets="));
const targets = targetsArg
  ? targetsArg.slice("--targets=".length).split(",").filter(Boolean)
  : ["rhel-openssl-1.0.x", "rhel-openssl-3.0.x", "debian-openssl-1.1.x", "debian-openssl-3.0.x"];

const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });
const step = (n, text) => console.log(`\n=== ${n}. ${text} ===`);

try {
  fs.rmSync(out, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
} catch (err) {
  if (err.code === "EBUSY" || err.code === "EPERM") {
    console.error(
      "\nCould not clear the old dist-cpanel folder because something is using it.\n" +
        "Close any terminal, File Explorer window or editor that is open inside dist-cpanel, then run this again."
    );
    process.exit(1);
  }
  throw err;
}
fs.mkdirSync(out, { recursive: true });

// 1. The database engine for the server's operating system (a different file for each kind of Linux).
step(1, `Preparing the database engine for: ${targets.join(", ")}`);
const baseSchema = fs.readFileSync(path.join(root, "prisma", "schema.prisma"), "utf8");
const schema = baseSchema.replace(
  /generator client \{[^}]*\}/,
  `generator client {\n  provider = "prisma-client-js"\n  output = "../dist-cpanel/.prisma-client"\n  binaryTargets = ${JSON.stringify(["native", ...targets])}\n}`
);
const tempSchema = path.join(root, "prisma", "deploy.schema.prisma");
fs.writeFileSync(tempSchema, schema);
try {
  run("npx prisma generate --schema prisma/deploy.schema.prisma");
} finally {
  fs.rmSync(tempSchema, { force: true });
}

// 2. The site itself.
step(2, "Building the site");
run("npm run build");

const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("The build did not produce .next/standalone/server.js. Is output: 'standalone' set in next.config.ts?");
}

step(3, "Assembling the package");
fs.cpSync(standalone, pkg, { recursive: true, dereference: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(pkg, ".next", "static"), { recursive: true });
fs.mkdirSync(path.join(pkg, "public"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) {
  fs.cpSync(path.join(root, "public"), path.join(pkg, "public"), { recursive: true });
}

// Swap in the engine files built for the server's system.
const clientDest = path.join(pkg, "node_modules", ".prisma", "client");
fs.rmSync(clientDest, { recursive: true, force: true });
fs.cpSync(path.join(out, ".prisma-client"), clientDest, { recursive: true });
fs.rmSync(path.join(out, ".prisma-client"), { recursive: true, force: true });
if (!localTest) {
  for (const f of fs.readdirSync(clientDest)) {
    if (/windows|darwin/i.test(f) && /query_engine|query-engine/.test(f)) fs.rmSync(path.join(clientDest, f));
  }
}

// Things the tracer might have missed but the server needs.
for (const needed of ["@prisma/client", "bcryptjs"]) {
  const dest = path.join(pkg, "node_modules", needed);
  if (!fs.existsSync(dest)) {
    console.log(`Adding ${needed} (it was not picked up automatically)`);
    fs.cpSync(path.join(root, "node_modules", needed), dest, { recursive: true });
  }
}

// Server helper files and the database change history.
for (const f of ["app.js", "setup-db.cjs", "backup.cjs"]) {
  fs.copyFileSync(path.join(root, "deploy", f), path.join(pkg, f));
}

// cPanel's Node.js page has a "Run JS script" button that lists the scripts in package.json,
// so the two server jobs can be started from there without a terminal.
const pkgJsonPath = path.join(pkg, "package.json");
const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
pkgJson.scripts = {
  setup: "node --no-warnings setup-db.cjs",
  backup: "node --no-warnings backup.cjs",
};
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + "\n");
const migrationsSrc = path.join(root, "prisma", "migrations");
for (const d of fs.readdirSync(migrationsSrc)) {
  const sql = path.join(migrationsSrc, d, "migration.sql");
  if (fs.existsSync(sql)) {
    fs.mkdirSync(path.join(pkg, "migrations", d), { recursive: true });
    fs.copyFileSync(sql, path.join(pkg, "migrations", d, "migration.sql"));
  }
}

// Safety sweep: never ship a database or secrets.
const forbidden = [];
(function sweep(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sweep(p);
    else if (/\.(db|db-journal|sqlite)$/i.test(e.name) || /^\.env/.test(e.name)) forbidden.push(p);
  }
})(pkg);
for (const p of forbidden) {
  console.log(`Removed from the package (must never be uploaded): ${path.relative(pkg, p)}`);
  fs.rmSync(p);
}

let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
} catch {}
fs.writeFileSync(path.join(pkg, "VERSION.txt"), `Built ${new Date().toISOString()} from commit ${commit}\nEngines: ${targets.join(", ")}\n`);

// 4. One zip. tar writes proper forward-slash paths, which Linux needs (PowerShell's zip does not).
step(4, "Creating the zip");
const zip = path.join(out, "shop-pos.zip");
if (process.platform === "win32") {
  // Windows' own tar can write zips. (Git's tar, which may come first on the PATH, cannot.)
  const winTar = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
  execSync(`"${winTar}" -a -c -f shop-pos.zip shop-pos`, { cwd: out, stdio: "inherit" });
} else {
  execSync("zip -rq shop-pos.zip shop-pos", { cwd: out, stdio: "inherit" });
}

const mb = (n) => (n / 1024 / 1024).toFixed(1) + " MB";
console.log(`\nDone. ${zip}  (${mb(fs.statSync(zip).size)})`);
console.log(`The same files, unzipped, are in: ${pkg}`);
