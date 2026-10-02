-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Variety" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currentStockKg" REAL NOT NULL DEFAULT 0,
    "avgCostPerKg" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varietyId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "varietyId" TEXT NOT NULL,
    "qtyKg" REAL NOT NULL,
    "ratePerKg" REAL NOT NULL,
    "totalRevenue" REAL NOT NULL,
    "costAtSale" REAL NOT NULL,
    "profit" REAL NOT NULL,
    "customerName" TEXT,
    "saleDate" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_varietyId_fkey" FOREIGN KEY ("varietyId") REFERENCES "Variety" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Variety_name_key" ON "Variety"("name");

-- CreateIndex
CREATE INDEX "Purchase_varietyId_idx" ON "Purchase"("varietyId");

-- CreateIndex
CREATE INDEX "Purchase_purchaseDate_idx" ON "Purchase"("purchaseDate");

-- CreateIndex
CREATE INDEX "Sale_varietyId_idx" ON "Sale"("varietyId");

-- CreateIndex
CREATE INDEX "Sale_saleDate_idx" ON "Sale"("saleDate");
