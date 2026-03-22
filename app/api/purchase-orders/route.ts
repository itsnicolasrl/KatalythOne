import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createPurchaseOrder, listPurchaseOrders, type PurchaseOrderItemCreateInput } from "@/src/services/purchaseOrders/purchaseOrdersService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const itemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.coerce.number().int().min(1),
  // Monto por unidad en la moneda seleccionada (ej: 100.50).
  unitPrice: z.coerce.number().finite().min(0),
});

const createSchema = z.object({
  supplierId: z.string().min(1),
  currency: z.string().min(3).max(3),
  orderNumber: z.string().max(80).optional().nullable(),
  expectedDeliveryAt: z.coerce.date().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.read",
    });

    const orders = await listPurchaseOrders({ companyId: company.id, take: 100 });
    return NextResponse.json({ orders });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.manage",
    });

    void user;

    const body = createSchema.parse(await req.json());

    const order = await createPurchaseOrder({
      companyId: company.id,
      supplierId: body.supplierId,
      currency: body.currency,
      orderNumber: body.orderNumber ?? null,
      expectedDeliveryAt: body.expectedDeliveryAt ?? null,
      items: body.items.map((it): PurchaseOrderItemCreateInput => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

