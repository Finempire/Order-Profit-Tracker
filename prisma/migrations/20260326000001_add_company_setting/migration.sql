-- CreateTable: CompanySetting (singleton row for company info shown on PDFs)
CREATE TABLE IF NOT EXISTS "CompanySetting" (
    "id"          TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT '',
    "gstin"       TEXT NOT NULL DEFAULT '',
    "address"     TEXT NOT NULL DEFAULT '',
    "phone"       TEXT NOT NULL DEFAULT '',
    "email"       TEXT NOT NULL DEFAULT '',
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySetting_pkey" PRIMARY KEY ("id")
);
