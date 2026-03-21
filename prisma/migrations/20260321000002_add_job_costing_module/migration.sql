-- CreateTable: JobCostSheet
CREATE TABLE IF NOT EXISTS "JobCostSheet" (
    "id"              TEXT NOT NULL,
    "orderId"         TEXT NOT NULL,
    "unitsProduced"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "standardCost"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetPrice"     DOUBLE PRECISION,
    "desiredProfit"   DOUBLE PRECISION,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobCostSheet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "JobCostSheet_orderId_key" ON "JobCostSheet"("orderId");

ALTER TABLE "JobCostSheet"
    ADD CONSTRAINT "JobCostSheet_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MaterialCostEntry
CREATE TABLE IF NOT EXISTS "MaterialCostEntry" (
    "id"              TEXT NOT NULL,
    "sheetId"         TEXT NOT NULL,
    "materialName"    TEXT NOT NULL,
    "qty"             DOUBLE PRECISION NOT NULL,
    "unitCost"        DOUBLE PRECISION NOT NULL,
    "valuationMethod" TEXT NOT NULL DEFAULT 'FIFO',
    "totalCost"       DOUBLE PRECISION NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialCostEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MaterialCostEntry"
    ADD CONSTRAINT "MaterialCostEntry_sheetId_fkey"
    FOREIGN KEY ("sheetId") REFERENCES "JobCostSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: LabourCostEntry
CREATE TABLE IF NOT EXISTS "LabourCostEntry" (
    "id"          TEXT NOT NULL,
    "sheetId"     TEXT NOT NULL,
    "workerName"  TEXT NOT NULL,
    "method"      TEXT NOT NULL DEFAULT 'TIME_RATE',
    "hours"       DOUBLE PRECISION,
    "ratePerHour" DOUBLE PRECISION,
    "units"       DOUBLE PRECISION,
    "ratePerUnit" DOUBLE PRECISION,
    "totalCost"   DOUBLE PRECISION NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LabourCostEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LabourCostEntry"
    ADD CONSTRAINT "LabourCostEntry_sheetId_fkey"
    FOREIGN KEY ("sheetId") REFERENCES "JobCostSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: OverheadCostEntry
CREATE TABLE IF NOT EXISTS "OverheadCostEntry" (
    "id"                 TEXT NOT NULL,
    "sheetId"            TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "type"               TEXT NOT NULL DEFAULT 'FIXED',
    "totalAmount"        DOUBLE PRECISION NOT NULL,
    "apportionmentBasis" TEXT NOT NULL DEFAULT 'MANUAL',
    "orderShare"         DOUBLE PRECISION NOT NULL,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OverheadCostEntry_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OverheadCostEntry"
    ADD CONSTRAINT "OverheadCostEntry_sheetId_fkey"
    FOREIGN KEY ("sheetId") REFERENCES "JobCostSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
