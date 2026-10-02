# Rice Shop Inventory

A shared inventory system for the rice shop: stock by variety, purchases, sales (with automatic stock deduction), balance stock, profit/loss, and a daily sales report. Built as one responsive web app so both owners can use it — one from the shop's computer, the other from a phone, anywhere.

## How it works

- **Stock** is tracked per rice variety with a running balance (`currentStockKg`) and a weighted-average cost (`avgCostPerKg`).
- **Recording a purchase** increases stock and recalculates the weighted-average cost.
- **Recording a sale** checks there's enough stock, computes profit using the average cost at that moment, and decreases stock — all in one database transaction, so stock is always accurate even if both owners enter data at the same time.
- Both owners log in with their own username/password and see the same live data.

## Local development

```bash
npm install
npx prisma migrate dev   # creates/updates the local SQLite database
npx prisma db seed       # creates the two owner accounts from .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local credentials come from `.env` (see `.env.example` for the variables needed — `OWNER1_USERNAME`/`OWNER1_PASSWORD`, `OWNER2_USERNAME`/`OWNER2_PASSWORD`).

## Deploying so both owners can use it

The shop owner will use this from the shop computer's browser; the other owner from his phone's browser, from wherever he is. For that, the app needs to live on the internet rather than just on one computer. This project is set up to deploy for free on **Vercel** (hosting) + **Neon** (a free Postgres database).

### 1. Create a free Postgres database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up (free tier is enough).
2. Create a new project (e.g. `rice-shop`).
3. From the project dashboard, copy the **connection string** (starts with `postgresql://...`).

### 2. Put the code on GitHub

1. Create a new repository on [github.com](https://github.com).
2. Push this project to it:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/log in (GitHub login is easiest).
2. Click **Add New Project** and import the GitHub repo you just created.
3. Before deploying, open **Environment Variables** and add:
   - `DATABASE_URL` — the Neon connection string from step 1
   - `SESSION_SECRET` — any random string, 32+ characters (e.g. generate one with `openssl rand -hex 32`)
   - `OWNER1_USERNAME`, `OWNER1_PASSWORD` — the shop owner's login
   - `OWNER2_USERNAME`, `OWNER2_PASSWORD` — the other owner's login
4. Click **Deploy**.

### 4. Set up the production database (one-time)

The database needs its tables created and the two owner accounts seeded. From your own computer, with the Neon connection string set as `DATABASE_URL`:

```bash
# change the datasource provider in prisma/schema.prisma from "sqlite" to "postgresql" first
npx prisma migrate deploy
npx prisma db seed
```

(Ask Claude to do this step for you if you'd rather not run it yourself — just share the Neon connection string.)

### 5. Open it from both places

Visit the `*.vercel.app` link Vercel gives you — from the shop computer's browser and from the other owner's phone browser. Both will see the same stock, purchases, sales, and reports, live.

## Notes

- New rice varieties don't need to be set up ahead of time — just type a new name the first time you record a purchase or sale for it.
- Selling more than what's in stock is blocked with a clear message, so the stock numbers always stay trustworthy.
