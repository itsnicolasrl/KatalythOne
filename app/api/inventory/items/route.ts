import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createInventoryItem, listInventoryItems } from "@/src/services/inventory/inventoryService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(80).optional().nullable(),
  unit: z.string().max(24).optional(),
  quantityOnHand: z.coerce.number().int().min(0).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional().nullable(),
  costPerUnit: z.coerce.number().finite().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.inventory.read",
    });

    const items = await listInventoryItems({ companyId: company.id });
    return NextResponse.json({ items });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.inventory.manage",
    });

    enforceRateLimit({
      key: `inventory-items:${user.id}:${getClientIp(req)}`,
      max: 60,
      windowMs: 60 * 60 * 1000,
    });

    const body = createSchema.parse(await req.json().catch(() => ({})));
    const costCentsPerUnit =
      body.costPerUnit === null || body.costPerUnit === undefined
        ? null
        : Math.round(body.costPerUnit * 100);

    const item = await createInventoryItem({
      companyId: company.id,
      name: body.name,
      sku: body.sku ?? null,
      unit: body.unit,
      quantityOnHand: body.quantityOnHand,
      lowStockThreshold: body.lowStockThreshold,
      costCentsPerUnit,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
