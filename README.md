# Rice Shop Inventory

A shared inventory and point-of-sale system for the rice shop: a bill screen for ringing up sales (multiple varieties per bill, discounts, payment methods, a printable-looking receipt), purchases, variety-level stock with cost/selling price/margin, profit/loss, and a daily sales report. Built as one responsive web app so both owners can use it — one from the shop's computer, the other from a phone, anywhere.

## How it works

- **Stock** is tracked per rice variety with a running balance (`currentStockKg`), a weighted-average cost (`avgCostPerKg`), a selling price (`pricePerKg`), and a reorder threshold used to flag low stock.
- **Recording a purchase** increases stock and recalculates the weighted-average cost.
- **New Bill** is a point-of-sale screen: tap a variety card to add it to the bill, adjust kilos/rate right on the receipt slip, apply a discount (amount or percent), pick a payment method (cash/card/wallet/credit), and complete the sale. Stock for every item on the bill is checked and decreased in one database transaction, so stock stays accurate even if both owners enter data at the same time. Each item's profit is computed from the variety's average cost at that moment.
- **Refunds / returns:** open a bill in Bill history and click **Refund**. It's pre-filled to return everything on the bill; lower the kilos to return only part. On confirm, the kilos go back into the same Bag/Open stock (at the cost they were sold at), the cash to give back is worked out (what the customer actually paid after any discount), a refund slip can be printed, and the daily sales and profit & loss reports take the returned sales off. If the customer still owed money on a credit bill, the refund cancels that debt first and only the rest is given back in cash. Cashiers can refund today's bills; only owners can refund older ones.
- **Bag and Open:** each variety's stock is kept separately for rice in sealed bags and rice sold loose ("open"), each with its own kilos, cost and selling price. Adding stock (the Purchase form, or Add variety on the Stock page) starts with choosing Bag or Open. On New Bill the cashier first chooses Bag or Open, then taps the varieties, and one bill can mix both. Receipts, reports and bill history show which packaging each line was.
- **Stock page** lists every variety with its cost, selling price, profit margin, and current stock (with a low-stock indicator), and lets you add, edit, or delete varieties, or jump to recording a purchase for one.
- **Printing:** after a sale, "Print receipt" opens the normal print dialog with a clean receipt (nothing else from the page). For a thermal receipt printer, choose it in the dialog and set the paper size to 80mm. There's an option to print automatically after every sale; to skip the dialog entirely, run Chrome with the `--kiosk-printing` flag.
- **Bill history** (`/bills`): every bill, searchable by bill number, customer name or phone, with a date range, a "still due" total and a reprint button. Owners also see cost and profit per bill. Cashiers see only today's bills and no cost or profit.
- **Expenses** (`/expenses`, owners only): record the shop's running costs — fuel, food, salaries, transport, electricity, rent, repairs, or anything the owner types in (tea, phone bill...). Each entry has a category, amount, date and optional note. The page shows the total spent and a split by category for any date range, and a mistaken entry can be deleted (with a confirmation). Expenses come off the profit: the dashboard shows today's expenses, the Daily report shows "profit after expenses", and Profit & Loss shows Expenses and **Net profit** (gross profit minus expenses) with a breakdown by type. Stock purchases are *not* expenses — rice bought is already counted in the cost of goods sold when it is sold. Cashiers never see this page.
- Both owners log in with their own username/password and see the same live data.
- **Theme:** everyone can pick **White** or **Black** with the switch in the menu (top bar on a phone, and on the login page). The choice is remembered separately on each device and browser. Receipts always print black on white.
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

The software has to live on the internet so both owners (and the counter) can reach the same live data.
It is set up for **cPanel hosting** with Node.js, such as Namecheap's Stellar Plus plan, at an address like
`https://pos.yourdomain.com`.

**Full step-by-step guide: [docs/DEPLOY-CPANEL.md](docs/DEPLOY-CPANEL.md)**

In short:
1. `npm run package:cpanel` builds the site on your computer and creates `dist-cpanel/shop-pos.zip`.
2. In GoDaddy (or wherever the domain is), add an **A record** for `pos` pointing at the hosting server's IP.
3. In cPanel: create the `pos` subdomain, upload and extract the zip, create the Node.js app (Node 22, startup file
   `app.js`), add the settings (database location, secret key, the three logins) in the app's *Environment variables*, then
   run the `setup` script from the Node.js page and restart the app.
4. Turn on HTTPS (AutoSSL) and add the daily backup cron job.

**About the database:** the live site uses a single SQLite file kept *outside* the web folder
(`/home/USER/shop-data/shop.db`), with a daily backup (`backup.cjs`, run from a cron job). Passwords and the secret key live
only in cPanel's settings, never in the code or the zip (the packaging step checks for this and removes any `.env` or
database file it finds).

**Other hosts (Render, Railway, a VPS):** the site is a normal Node.js app, so it can run elsewhere, but the database
step differs. SQLite needs a disk that is kept between restarts; otherwise the database would have to be switched to
PostgreSQL, which means creating a PostgreSQL version of the migrations (the existing ones are written for SQLite).

## Notes

- New rice varieties can be created from the Stock page ("Add variety"), or just by typing a new name the first time you record a purchase.
- Selling more than what's in stock is blocked with a clear message, so the stock numbers always stay trustworthy.
- The shop name and address shown on the receipt come from `NEXT_PUBLIC_SHOP_NAME` and `NEXT_PUBLIC_SHOP_ADDRESS` in `.env` — change those and restart `npm run dev` to see it on your own computer. On the live hosting the name and address are built into the upload zip, so after changing them run `npm run package:cpanel` again and upload the new zip.
- "Credit" is just a payment-method label for record-keeping — if you leave "Amount received" blank it's treated as paid in full; enter a smaller amount (or 0) to track how much is still due.
