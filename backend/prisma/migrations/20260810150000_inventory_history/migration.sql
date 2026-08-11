-- CreateTable
CREATE TABLE "InventoryHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "adminId" TEXT,
    "changeKg" DECIMAL(10,2) NOT NULL,
    "previousStockKg" DECIMAL(10,2) NOT NULL,
    "newStockKg" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryHistory_productId_createdAt_idx" ON "InventoryHistory"("productId", "createdAt");
CREATE INDEX "InventoryHistory_orderId_idx" ON "InventoryHistory"("orderId");

ALTER TABLE "InventoryHistory" ADD CONSTRAINT "InventoryHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryHistory" ADD CONSTRAINT "InventoryHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
