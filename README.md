# Rice Shop Inventory

A shared inventory and point-of-sale system for the rice shop: a bill screen for ringing up sales (multiple varieties per bill, discounts, payment methods, a printable-looking receipt), purchases, variety-level stock with cost/selling price/margin, profit/loss, and a daily sales report. Built as one responsive web app so both owners can use it — one from the shop's computer, the other from a phone, anywhere.

## How it works

- **Stock** is tracked per rice variety with a running balance (`currentStockKg`), a weighted-average cost (`avgCostPerKg`), a selling price (`pricePerKg`), and a reorder threshold used to flag low stock.
- **Recording a purchase** increases stock and recalculates the weighted-average cost.
- **New Bill** is a point-of-sale screen: tap a variety card to add it to the bill, adjust kilos/rate right on the receipt slip, apply a discount (amount or percent), pick a payment method (cash/card/wallet/credit), and complete the sale. Stock for every item on the bill is checked and decreased in one database transaction, so stock stays accurate even if both owners enter data at the same time. Each item's profit is computed from the variety's average cost at that moment.
- **Stock page** lists every variety with its cost, selling price, profit margin, and current stock (with a low-stock indicator), and lets you add, edit, or delete varieties, or jump to recording a purchase for one.
- **Printing:** after a sale, "Print receipt" opens the normal print dialog with a clean receipt (nothing else from the page). For a thermal receipt printer, choose it in the dialog and set the paper size to 80mm. There's an option to print automatically after every sale; to skip the dialog entirely, run Chrome with the `--kiosk-printing` flag.
- **Bill history** (`/bills`): every bill, searchable by bill number, customer name or phone, with a date range, a "still due" total and a reprint button. Owners also see cost and profit per bill. Cashiers see only today's bills and no cost or profit.
- Both owners log in with their own username/password and see the same live data.
- **Two kinds of accounts.** *Owners* can see and do everything: bills, purchases, stock (add/edit/correct/delete), cost prices, profit and loss, and reports. The *cashier* account can only make bills: it sees varieties, selling prices and kilos in stock, but never cost prices, profit, purchases or reports. This is enforced on the server, not just hidden in the menu.

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
   - `CASHIER_USERNAME`, `CASHIER_PASSWORD` — the counter staff login (can only make bills)
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

- New rice varieties can be created from the Stock page ("Add variety"), or just by typing a new name the first time you record a purchase.
- Selling more than what's in stock is blocked with a clear message, so the stock numbers always stay trustworthy.
- The shop name and address shown on the receipt come from `NEXT_PUBLIC_SHOP_NAME` and `NEXT_PUBLIC_SHOP_ADDRESS` in `.env` — change those and restart the app to update them.
- "Credit" is just a payment-method label for record-keeping — if you leave "Amount received" blank it's treated as paid in full; enter a smaller amount (or 0) to track how much is still due.
