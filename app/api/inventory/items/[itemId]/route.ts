import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import {
  deleteInventoryItem,
  updateInventoryItem,
} from "@/src/services/inventory/inventoryService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(80).optional().nullable(),
  unit: z.string().max(24).optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional().nullable(),
  costPerUnit: z.coerce.number().finite().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    requireSameOrigin(req);
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.inventory.manage",
    });

    const body = patchSchema.parse(await req.json().catch(() => ({})));
    const costCentsPerUnit =
      body.costPerUnit === undefined
        ? undefined
        : body.costPerUnit === null
          ? null
          : Math.round(body.costPerUnit * 100);

    const item = await updateInventoryItem({
      companyId: company.id,
      itemId: params.itemId,
      input: {
        name: body.name,
        sku: body.sku,
        unit: body.unit,
        lowStockThreshold: body.lowStockThreshold,
        costCentsPerUnit,
        notes: body.notes,
      },
    });
    return NextResponse.json({ item });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.inventory.manage",
    });

    await deleteInventoryItem({ companyId: company.id, itemId: params.itemId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
