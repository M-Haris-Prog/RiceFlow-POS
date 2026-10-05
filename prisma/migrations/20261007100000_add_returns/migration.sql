-- CreateTable
CREATE TABLE "BillReturn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billId" TEXT NOT NULL,
    "refundAmount" REAL NOT NULL,
    "dueReduced" REAL NOT NULL DEFAULT 0,
    "cashRefunded" REAL NOT NULL,
    "note" TEXT,
    "returnDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "BillReturn_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BillReturn_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "qtyKg" REAL NOT NULL,
    "refundAmount" REAL NOT NULL,
    "revenueReversed" REAL NOT NULL,
    "costReversed" REAL NOT NULL,
    "profitReversed" REAL NOT NULL,
    "discountReversed" REAL NOT NULL,
    CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "BillReturn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnItem_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "returnedKg" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "SaleItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SaleItem" ("billId", "costAtSale", "id", "packaging", "profit", "qtyKg", "ratePerKg", "totalRevenue", "varietyId") SELECT "billId", "costAtSale", "id", "packaging", "profit", "qtyKg", "ratePerKg", "totalRevenue", "varietyId" FROM "SaleItem";
DROP TABLE "SaleItem";
ALTER TABLE "new_SaleItem" RENAME TO "SaleItem";
CREATE INDEX "SaleItem_varietyId_idx" ON "SaleItem"("varietyId");
CREATE INDEX "SaleItem_billId_idx" ON "SaleItem"("billId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BillReturn_billId_idx" ON "BillReturn"("billId");

-- CreateIndex
CREATE INDEX "BillReturn_returnDate_idx" ON "BillReturn"("returnDate");

-- CreateIndex
CREATE INDEX "ReturnItem_saleItemId_idx" ON "ReturnItem"("saleItemId");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

