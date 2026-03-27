-- CreateEnum
CREATE TYPE "CustomerKind" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('MEETING', 'CUSTOMER_PAYMENT_DUE', 'SUPPLIER_PAYMENT_DUE', 'TAX_DUE', 'CAMPAIGN_LAUNCH', 'TASK', 'OPERATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CalendarEventStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OnboardingStepKey" ADD VALUE 'BUSINESS_STAGE';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'YEARS_OPERATING';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'TEAM_SIZE';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'CURRENT_CLIENT_TYPE';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'ACTIVE_CLIENTS';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'TOP_CLIENT_CONCENTRATION';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'MONTHLY_INCOME_RANGE';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'MONTHLY_EXPENSE_RANGE';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'MATURITY_LEVEL';
ALTER TYPE "OnboardingStepKey" ADD VALUE 'GOALS';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactRole" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "kind" "CustomerKind" NOT NULL DEFAULT 'PERSON',
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "secondaryEmail" TEXT,
ADD COLUMN     "secondaryPhone" TEXT,
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budgetCurrency" TEXT,
ADD COLUMN     "estimatedCostCents" BIGINT,
ADD COLUMN     "estimatedRevenueCents" BIGINT;

-- AlterTable
ALTER TABLE "Revenue" ADD COLUMN     "inventoryItemId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountDeletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "accountDeletionScheduledFor" TIMESTAMP(3),
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER,
    "customerId" TEXT,
    "projectId" TEXT,
    "supplierId" TEXT,
    "taskId" TEXT,
    "operationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTimeEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "paymentTermsDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderNumber" TEXT,
    "currency" TEXT NOT NULL,
    "expectedDeliveryAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" BIGINT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "receivedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptItem" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderItemId" TEXT NOT NULL,
    "receivedQuantity" INTEGER NOT NULL,
    "receivedAmountCents" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_companyId_startAt_idx" ON "CalendarEvent"("companyId", "startAt");

-- CreateIndex
CREATE INDEX "ProjectTimeEntry_companyId_projectId_occurredAt_idx" ON "ProjectTimeEntry"("companyId", "projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProjectTimeEntry_companyId_userId_occurredAt_idx" ON "ProjectTimeEntry"("companyId", "userId", "occurredAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_status_idx" ON "PurchaseOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_companyId_purchaseOrderId_receivedAt_idx" ON "PurchaseReceipt"("companyId", "purchaseOrderId", "receivedAt");

-- CreateIndex
CREATE INDEX "PurchaseReceiptItem_receiptId_purchaseOrderItemId_idx" ON "PurchaseReceiptItem"("receiptId", "purchaseOrderItemId");

-- CreateIndex
CREATE INDEX "Customer_companyId_kind_idx" ON "Customer"("companyId", "kind");

-- CreateIndex
CREATE INDEX "User_accountDeletionScheduledFor_idx" ON "User"("accountDeletionScheduledFor");

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTimeEntry" ADD CONSTRAINT "ProjectTimeEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTimeEntry" ADD CONSTRAINT "ProjectTimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTimeEntry" ADD CONSTRAINT "ProjectTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
