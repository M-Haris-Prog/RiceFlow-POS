# Putting the shop software online on Namecheap hosting (cPanel)

This puts the software at **https://pos.alshaikhtraders.com**. It uses the Namecheap Stellar Plus hosting and
leaves the main domain `alshaikhtraders.com` alone (no nameserver change).

Values used below (from the hosting account):

| What | Value |
|---|---|
| cPanel username | `alshxsnl` |
| Server address (IP) | `66.29.146.28` |
| Node.js version | `22.23.3` |
| Address of the POS | `pos.alshaikhtraders.com` |
| Software folder | `/home/alshxsnl/shop-pos` |
| Database file | `/home/alshxsnl/shop-data/shop.db` |
| Backups folder | `/home/alshxsnl/shop-backups` |

> **Passwords and secrets** are typed only into cPanel's settings boxes (step B5). Never put them in a file,
> an email or a chat message.

---

## Part 0: Build the upload package (on the computer that has the project)

```bash
npm run package:cpanel
```

This takes a few minutes and creates `dist-cpanel/shop-pos.zip`. Run it again whenever the software changes.
(If the zip is too big to upload, ask for a smaller one that contains only your server's database engine.)

## Part A: Point the address at the hosting (GoDaddy)

Do this first, because it can take a while to start working.

1. GoDaddy → your domain `alshaikhtraders.com` → **DNS** (or "Manage DNS").
2. **Add New Record**:
   - Type: **A**
   - Name: **pos**
   - Value: **66.29.146.28**
   - TTL: leave the default
3. Save. Do **not** change the nameservers, and do not touch the existing records.

## Part B: Set it up in cPanel (Namecheap → Hosting List → Manage → Go to cPanel)

**B1. Create the address.** Tools → **Domains** → **Create A New Domain**.
- Domain: `pos.alshaikhtraders.com`
- Untick **Share document root**. Leave the document root as suggested.
- Create.

**B2. Upload the package.** Tools → **File Manager** → open your home folder (`/home/alshxsnl`) → **Upload**
`shop-pos.zip` → when it finishes, right-click it → **Extract**. You should now have a folder
`/home/alshxsnl/shop-pos`. Delete the zip afterwards.

**B3. Create the app.** Tools → **Setup Node.js App** → **Create Application**:
- Node.js version: **22.23.3**
- Application mode: **Production**
- Application root: **shop-pos**
- Application URL: **pos.alshaikhtraders.com**
- Application startup file: **app.js**
- Click **Create**.

**B4. Make a long random secret** (on your own computer, in PowerShell). It signs people in. Keep it private:

```bash
node -p "require('crypto').randomBytes(32).toString('hex')"
```

**B5. Add the settings.** On the app's page, **Environment variables** → **Add variable**, once per row:

| Name | Value |
|---|---|
| `DATABASE_URL` | `file:/home/alshxsnl/shop-data/shop.db?connection_limit=1` |
| `SESSION_SECRET` | the long secret from B4 |
| `OWNER1_USERNAME` | the first owner's login name |
| `OWNER1_PASSWORD` | the first owner's password (8+ characters) |
| `OWNER1_DISPLAY_NAME` | for example `Shop Owner` |
| `OWNER2_USERNAME` | the second owner's login name |
| `OWNER2_PASSWORD` | the second owner's password (8+ characters) |
| `OWNER2_DISPLAY_NAME` | for example `Remote Owner` |
| `CASHIER_USERNAME` | the counter staff login name |
| `CASHIER_PASSWORD` | the cashier's password (8+ characters) |
| `CASHIER_DISPLAY_NAME` | for example `Cashier` |
| `SHOP_TIMEZONE` | `Asia/Karachi` |

Use real passwords, not the test ones. **Save**.

**B6. Create the database and the logins.** On the app's page click **Run JS script**, choose **setup**, and run it.
It should print lines like "Account ready: ...". It is safe to run again; running it again also **resets the three
passwords** to whatever is in the settings.

**B7. Start it.** Click **Restart** on the app's page.

**B8. HTTPS (the padlock).** Tools → **SSL/TLS Status** → **Run AutoSSL**. It only works once the GoDaddy record from
Part A is live. Logging in needs HTTPS to be working.

**B9. Daily backup.** Tools → **Cron Jobs** → add a job once a day (for example at 02:00) with this command
(check the Node path in the "Enter to the virtual environment" line at the top of the Node.js app page, and use the
same path if it differs):

```bash
DATABASE_URL="file:/home/alshxsnl/shop-data/shop.db" /home/alshxsnl/nodevenv/shop-pos/22/bin/node --no-warnings /home/alshxsnl/shop-pos/backup.cjs
```

It keeps the newest 30 backups in `/home/alshxsnl/shop-backups`. **Download one now and then** (File Manager) and keep
it somewhere that is not this hosting.

## Part C: Try it before using it for real

1. Open `https://pos.alshaikhtraders.com` and sign in as an owner.
2. Add a variety with some stock, make a bill, print it, refund part of it, look at the daily report.
3. Sign in as the cashier. They should see only New Bill and Bills, and no cost prices.
4. Check the shop name and city print correctly in Urdu.
5. Only then start using it for real sales.

## Updating later

1. `npm run package:cpanel` on the computer with the project.
2. Upload and extract the new zip over `/home/alshxsnl/shop-pos` (overwrite). Your database is **not** in that folder,
   so it is not touched.
3. **Run JS script** → **setup** (applies any new database changes; it keeps a copy of the database first).
4. **Restart** the app.

## If something goes wrong

- **The site shows an error or a blank page:** in File Manager, look for `stderr.log` inside `/home/alshxsnl/shop-pos`
  (or the `logs` folder cPanel shows on the app page) and send me the last lines. Never include passwords.
- **You can't sign in:** HTTPS must be working (B8). Re-run **setup** to reset the passwords from the settings.
- **"Out of memory" or random restarts:** the plan limit is 2 GB; tell me and I'll check what is using it.
- **The database engine fails to load:** the server's system may differ from the ones included. Send me the error.
