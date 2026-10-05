-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varietyId" TEXT NOT NULL,
    "packaging" TEXT NOT NULL,
    "currentStockKg" REAL NOT NULL DEFAULT 0,
    "avgCostPerKg" REAL NOT NULL DEFAULT 0,
    "pricePerKg" REAL NOT NULL DEFAULT 0,
    "reorderLevel" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockItem_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Keep existing stock: every variety's current stock, cost, price and alert level becomes its "OPEN" stock.
-- (Existing purchases and sale items default to "OPEN" below, so history still matches.)
INSERT INTO "StockItem" ("id", "varietyId", "packaging", "currentStockKg", "avgCostPerKg", "pricePerKg", "reorderLevel")
SELECT lower(hex(randomblob(12))), "id", 'OPEN', "currentStockKg", "avgCostPerKg", "pricePerKg", "reorderLevel" FROM "Variety";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varietyId" TEXT NOT NULL,
    "packaging" TEXT NOT NULL DEFAULT 'OPEN',
    "qtyKg" REAL NOT NULL,
    "ratePerKg" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "supplierName" TEXT,
    "purchaseDate" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Purchase" ("createdAt", "createdById", "id", "purchaseDate", "qtyKg", "ratePerKg", "supplierName", "totalCost", "varietyId") SELECT "createdAt", "createdById", "id", "purchaseDate", "qtyKg", "ratePerKg", "supplierName", "totalCost", "varietyId" FROM "Purchase";
DROP TABLE "Purchase";
ALTER TABLE "new_Purchase" RENAME TO "Purchase";
CREATE INDEX "Purchase_varietyId_idx" ON "Purchase"("varietyId");
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");
CREATE TABLE "new_SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "varietyId" TEXT NOT NULL,
    "packaging" TEXT NOT NULL DEFAULT 'OPEN',
    "qtyKg" REAL NOT NULL,
    "ratePerKg" REAL NOT NULL,
    "totalRevenue" REAL NOT NULL,
    "costAtSale" REAL NOT NULL,
    "profit" REAL NOT NULL,
    CONSTRAINT "SaleItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("billId", "costAtSale", "id", "profit", "qtyKg", "ratePerKg", "totalRevenue", "varietyId") SELECT "billId", "costAtSale", "id", "profit", "qtyKg", "ratePerKg", "totalRevenue", "varietyId" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE INDEX "SaleItem_varietyId_idx" ON "SaleItem"("varietyId");
CREATE INDEX "SaleItem_billId_idx" ON "SaleItem"("billId");
CREATE TABLE "new_Variety" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Variety" ("category", "createdAt", "id", "name") SELECT "category", "createdAt", "id", "name" FROM "Variety";
DROP TABLE "Variety";
ALTER TABLE "new_Variety" RENAME TO "Variety";
CREATE UNIQUE INDEX "Variety_name_key" ON "Variety"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_varietyId_packaging_key" ON "StockItem"("varietyId", "packaging");
