import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { sanitizeText } from "@/src/lib/sanitize";
import type { InventoryMovementDirection } from "@/src/generated/prisma";

export type ItemCreateInput = {
  companyId: string;
  name: string;
  sku?: string | null;
  unit?: string;
  quantityOnHand?: number;
  lowStockThreshold?: number | null;
  costCentsPerUnit?: number | null;
  notes?: string | null;
};

export type ItemUpdateInput = {
  name?: string;
  sku?: string | null;
  unit?: string;
  lowStockThreshold?: number | null;
  costCentsPerUnit?: number | null;
  notes?: string | null;
};

export async function listInventoryItems(params: { companyId: string; take?: number }) {
  const prisma = getPrisma();
  return prisma.inventoryItem.findMany({
    where: { companyId: params.companyId },
    orderBy: { name: "asc" },
    take: params.take ?? 200,
  });
}

export async function createInventoryItem(input: ItemCreateInput) {
  const prisma = getPrisma();
  const name = sanitizeText(input.name, { maxLen: 200 });
  if (!name) throw new HttpError("Nombre requerido", 400, "NAME_REQUIRED");

  const qty = input.quantityOnHand ?? 0;
  if (!Number.isInteger(qty) || qty < 0) {
    throw new HttpError("Cantidad inicial inválida", 400, "QTY_INVALID");
  }

  return prisma.inventoryItem.create({
    data: {
      companyId: input.companyId,
      name,
      sku: input.sku ? sanitizeText(input.sku, { maxLen: 80 }) : null,
      unit: sanitizeText(input.unit ?? "ud", { maxLen: 24 }) || "ud",
      quantityOnHand: qty,
      lowStockThreshold:
        input.lowStockThreshold === null || input.lowStockThreshold === undefined
          ? null
          : input.lowStockThreshold,
      costCentsPerUnit: input.costCentsPerUnit ?? null,
      notes: input.notes ? sanitizeText(input.notes, { maxLen: 1000 }) : null,
    },
  });
}

export async function updateInventoryItem(params: {
  companyId: string;
  itemId: string;
  input: ItemUpdateInput;
}) {
  const prisma = getPrisma();
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: params.itemId, companyId: params.companyId },
  });
  if (!existing) throw new HttpError("Producto no encontrado", 404, "ITEM_NOT_FOUND");

  const data: Record<string, unknown> = {};
  if (params.input.name !== undefined) {
    const n = sanitizeText(params.input.name, { maxLen: 200 });
    if (!n) throw new HttpError("Nombre requerido", 400, "NAME_REQUIRED");
    data.name = n;
  }
  if (params.input.sku !== undefined) {
    data.sku = params.input.sku ? sanitizeText(params.input.sku, { maxLen: 80 }) : null;
  }
  if (params.input.unit !== undefined) {
    data.unit = sanitizeText(params.input.unit, { maxLen: 24 }) || "ud";
  }
  if (params.input.lowStockThreshold !== undefined) {
    data.lowStockThreshold = params.input.lowStockThreshold;
  }
  if (params.input.costCentsPerUnit !== undefined) {
    data.costCentsPerUnit = params.input.costCentsPerUnit;
  }
  if (params.input.notes !== undefined) {
    data.notes = params.input.notes ? sanitizeText(params.input.notes, { maxLen: 1000 }) : null;
  }

  if (Object.keys(data).length === 0) {
    const unchanged = await prisma.inventoryItem.findFirst({
      where: { id: params.itemId, companyId: params.companyId },
    });
    if (!unchanged) throw new HttpError("Producto no encontrado", 404, "ITEM_NOT_FOUND");
    return unchanged;
  }

  return prisma.inventoryItem.update({
    where: { id: params.itemId },
    data,
  });
}

export async function deleteInventoryItem(params: { companyId: string; itemId: string }) {
  const prisma = getPrisma();
  const existing = await prisma.inventoryItem.findFirst({
    where: { id: params.itemId, companyId: params.companyId },
  });
  if (!existing) throw new HttpError("Producto no encontrado", 404, "ITEM_NOT_FOUND");
  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.deleteMany({
      where: { itemId: params.itemId, companyId: params.companyId },
    });
    await tx.inventoryItem.delete({ where: { id: params.itemId } });
  });
  return { ok: true };
}

export async function listMovements(params: { companyId: string; itemId?: string; take?: number }) {
  const prisma = getPrisma();
  return prisma.inventoryMovement.findMany({
    where: {
      companyId: params.companyId,
      ...(params.itemId ? { itemId: params.itemId } : {}),
    },
    orderBy: { occurredAt: "desc" },
    take: params.take ?? 100,
    include: { item: { select: { id: true, name: true, unit: true } } },
  });
}

export async function createMovement(params: {
  companyId: string;
  itemId: string;
  direction: InventoryMovementDirection;
  quantity: number;
  occurredAt: Date;
  note?: string | null;
}) {
  const prisma = getPrisma();
  if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
    throw new HttpError("Cantidad debe ser un entero positivo", 400, "QTY_INVALID");
  }

  const item = await prisma.inventoryItem.findFirst({
    where: { id: params.itemId, companyId: params.companyId },
  });
  if (!item) throw new HttpError("Producto no encontrado", 400, "ITEM_NOT_FOUND");

  const delta = params.direction === "IN" ? params.quantity : -params.quantity;
  if (item.quantityOnHand + delta < 0) {
    throw new HttpError("Stock insuficiente para esta salida", 400, "INSUFFICIENT_STOCK");
  }

  return prisma.$transaction(async (tx) => {
    const mov = await tx.inventoryMovement.create({
      data: {
        companyId: params.companyId,
        itemId: params.itemId,
        direction: params.direction,
        quantity: params.quantity,
        occurredAt: params.occurredAt,
        note: params.note ? sanitizeText(params.note, { maxLen: 500 }) : null,
      },
      include: { item: { select: { id: true, name: true, unit: true } } },
    });
    await tx.inventoryItem.update({
      where: { id: params.itemId },
      data: { quantityOnHand: { increment: delta } },
    });
    return mov;
  });
}
