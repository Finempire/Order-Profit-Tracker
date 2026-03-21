-- AlterTable: add currency and exchangeRate to Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable: add discount to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
