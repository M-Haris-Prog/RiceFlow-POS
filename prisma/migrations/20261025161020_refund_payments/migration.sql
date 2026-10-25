-- CreateTable
CREATE TABLE "RefundPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "RefundPayment_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "BillReturn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RefundPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RefundPayment_returnId_idx" ON "RefundPayment"("returnId");

-- Refunds made before this change were all handed over in full, so record them as fully paid.
INSERT INTO "RefundPayment" ("id", "returnId", "amount", "paidAt", "note", "createdById")
SELECT lower(hex(randomblob(12))), "id", "cashRefunded", "returnDate", NULL, "createdById"
FROM "BillReturn" WHERE "cashRefunded" > 0;
