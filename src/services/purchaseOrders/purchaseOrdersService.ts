import { getPrisma } from "@/src/db/prisma";
import { HttpError } from "@/src/lib/errors/HttpError";
import { centsToBigInt } from "@/src/lib/money/centsBigInt";
import { sanitizeText } from "@/src/lib/sanitize";

export type PurchaseOrderItemCreateInput = {
  description: string;
  quantity: number;
  unitPrice: number; // monto por unidad (en moneda, p.ej. 100.50)
};

export type PurchaseOrderCreateInput = {
  companyId: string;
  supplierId: string;
  currency: string;
  orderNumber?: string | null;
  expectedDeliveryAt?: Date | null;
  items: PurchaseOrderItemCreateInput[];
};

export type PurchaseOrderReceiveInput = {
  companyId: string;
  purchaseOrderId: string;
  receivedAt: Date;
  note?: string | null;
  projectId?: string | null;
  receivedByUserId?: string | null;
};

function normalizeCurrency(currency: string): string {
  const cur = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(cur)) throw new HttpError("Moneda inválida (ISO 4217)", 400, "CURRENCY_INVALID");
  return cur;
}

function moneyToCentsNumber(amount: number) {
  if (!Number.isFinite(amount)) throw new HttpError("Monto inválido", 400, "MONEY_INVALID");
  const cents = Math.round(amount * 100);
  if (!Number.isInteger(cents)) throw new HttpError("Monto inválido", 400, "MONEY_INVALID");
  if (cents <= 0) throw new HttpError("Monto debe ser > 0", 400, "AMOUNT_INVALID");
  return cents;
}

export async function listPurchaseOrders(params: { companyId: string; take?: number }) {
  const prisma = getPrisma();
  const orders = await prisma.purchaseOrder.findMany({
    where: { companyId: params.companyId },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 50,
    select: {
      id: true,
      status: true,
      orderNumber: true,
      currency: true,
      expectedDeliveryAt: true,
      receivedAt: true,
      isPaid: true,
      paidAt: true,
      supplier: { select: { id: true, name: true } },
      items: {
        select: { amountCents: true, receivedQuantity: true, quantity: true },
      },
    },
  });

  return orders.map((o) => {
    const totalAmountCents = o.items.reduce((acc, it) => acc + Number(it.amountCents), 0);
    const totalReceivedCents = o.items.reduce((acc, it) => {
      const received = Math.min(it.receivedQuantity, it.quantity);
      const ratio = it.quantity > 0 ? received / it.quantity : 0;
      return acc + Math.round(Number(it.amountCents) * ratio);
    }, 0);

    return {
      id: o.id,
      status: o.status,
      orderNumber: o.orderNumber,
      currency: o.currency,
      expectedDeliveryAt: o.expectedDeliveryAt,
      receivedAt: o.receivedAt,
      supplier: o.supplier,
      isPaid: o.isPaid,
      paidAt: o.paidAt,
      totalAmountCents,
      totalReceivedCents,
    };
  });
}

export async function createPurchaseOrder(input: PurchaseOrderCreateInput) {
  const prisma = getPrisma();

  const currency = normalizeCurrency(input.currency);
  const orderNumber = input.orderNumber ? sanitizeText(input.orderNumber, { maxLen: 80 }) : null;

  if (input.items.length === 0) throw new HttpError("Debe incluir al menos un item", 400, "PO_ITEMS_EMPTY");

  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, companyId: input.companyId },
    select: { id: true },
  });
  if (!supplier) throw new HttpError("Proveedor no existe en esta empresa", 400, "SUPPLIER_INVALID");

  const items = input.items.map((it) => {
    const quantity = Math.round(it.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new HttpError("Cantidad inválida", 400, "PO_QTY_INVALID");
    const unitPriceCentsNum = moneyToCentsNumber(it.unitPrice);
    const unitPriceCents = centsToBigInt(unitPriceCentsNum);
    const amountCents = unitPriceCents * BigInt(quantity);
    return {
      description: sanitizeText(it.description.trim(), { maxLen: 200 }),
      quantity,
      unitPriceCents,
      amountCents,
    };
  });

  const order = await prisma.purchaseOrder.create({
    data: {
      companyId: input.companyId,
      supplierId: input.supplierId,
      currency,
      orderNumber,
      expectedDeliveryAt: input.expectedDeliveryAt ?? null,
      items: {
        create: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPriceCents: it.unitPriceCents,
          amountCents: it.amountCents,
        })),
      },
    },
    select: {
      id: true,
      status: true,
      orderNumber: true,
      currency: true,
      expectedDeliveryAt: true,
      receivedAt: true,
      isPaid: true,
      supplier: { select: { id: true, name: true } },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPriceCents: true,
          amountCents: true,
          receivedQuantity: true,
        },
      },
    },
  });

    // Convert BigInts to numbers for JSON serialization
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      unitPriceCents: Number(item.unitPriceCents),
      amountCents: Number(item.amountCents),
    })),
  };
}

export async function getPurchaseOrderDetail(params: { companyId: string; purchaseOrderId: string }) {
  const prisma = getPrisma();
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: params.purchaseOrderId, companyId: params.companyId },
    select: {
      id: true,
      status: true,
      orderNumber: true,
      currency: true,
      expectedDeliveryAt: true,
      receivedAt: true,
      isPaid: true,
      paidAt: true,
      supplier: { select: { id: true, name: true } },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPriceCents: true,
          amountCents: true,
          receivedQuantity: true,
        },
      },
    },
  });

  if (!order) throw new HttpError("Orden de compra no encontrada", 404, "PO_NOT_FOUND");

  // Convert BigInts to numbers for JSON serialization
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      unitPriceCents: Number(item.unitPriceCents),
      amountCents: Number(item.amountCents),
    })),
  };
}

export async function receivePurchaseOrder(input: PurchaseOrderReceiveInput) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findFirst({
      where: { id: input.purchaseOrderId, companyId: input.companyId },
      select: {
        id: true,
        currency: true,
        supplier: { select: { name: true } },
        items: {
          select: {
            id: true,
            quantity: true,
            amountCents: true,
            description: true,
          },
        },
      },
    });

    if (!order) throw new HttpError("Orden de compra no encontrada", 404, "PO_NOT_FOUND");

    const receipt = await tx.purchaseReceipt.create({
      data: {
        companyId: input.companyId,
        purchaseOrderId: order.id,
        receivedAt: input.receivedAt,
        note: input.note?.trim() || null,
        receivedByUserId: input.receivedByUserId ?? null,
        receiptItems: {
          create: order.items.map((it) => ({
            purchaseOrderItemId: it.id,
            receivedQuantity: it.quantity,
            receivedAmountCents: it.amountCents,
          })),
        },
      },
      select: { id: true },
    });

    // Marca la orden como recibida y completa cantidades por item.
    await Promise.all(
      order.items.map((it) =>
        tx.purchaseOrderItem.update({
          where: { id: it.id },
          data: { receivedQuantity: it.quantity },
        }),
      ),
    );

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: "RECEIVED",
        receivedAt: input.receivedAt,
      },
    });

    // Crea gastos asociados al proyecto (si se pasó projectId).
    if (input.projectId) {
      await Promise.all(
        order.items.map((it) =>
          tx.expense.create({
            data: {
              companyId: input.companyId,
              occurredAt: input.receivedAt,
              amountCents: it.amountCents,
              currency: order.currency,
              description: it.description,
              category: "INSUMOS",
              vendor: sanitizeText(order.supplier.name, { maxLen: 120 }),
              paymentMethod: null,
              isRecurring: false,
              projectId: input.projectId,
            },
          }),
        ),
      );
    }

    return { ok: true, receiptId: receipt.id };
  });
}

