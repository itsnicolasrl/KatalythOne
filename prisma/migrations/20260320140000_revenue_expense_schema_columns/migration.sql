-- Alinea Revenue y Expense con schema.prisma (columnas añadidas tras la migración inicial)

-- Revenue: campos de detalle de venta
ALTER TABLE "Revenue" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Revenue" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "Revenue" ADD COLUMN IF NOT EXISTS "channel" TEXT;
ALTER TABLE "Revenue" ADD COLUMN IF NOT EXISTS "quantity" INTEGER;
ALTER TABLE "Revenue" ADD COLUMN IF NOT EXISTS "unitPriceCents" INTEGER;

-- Expense: categorización y recurrencia
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;

-- Company: logo (por si la BD antigua no la tenía)
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Índice definido en schema para Expense
CREATE INDEX IF NOT EXISTS "Expense_companyId_category_idx" ON "Expense"("companyId", "category");
