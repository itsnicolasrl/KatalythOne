import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createMovement, listMovements } from "@/src/services/inventory/inventoryService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const postSchema = z.object({
  itemId: z.string().min(1),
  direction: z.enum(["IN", "OUT"]),
  quantity: z.coerce.number().int().positive(),
  occurredAt: z.coerce.date(),
  note: z.string().max(500).optional().nullable(),
});

export async function GET(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.inventory.read",
    });

    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId") ?? undefined;

    const movements = await listMovements({ companyId: company.id, itemId });
    return NextResponse.json({ movements });
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
      key: `inventory-mov:${user.id}:${getClientIp(req)}`,
      max: 120,
      windowMs: 60 * 60 * 1000,
    });

    const body = postSchema.parse(await req.json().catch(() => ({})));
    const movement = await createMovement({
      companyId: company.id,
      itemId: body.itemId,
      direction: body.direction,
      quantity: body.quantity,
      occurredAt: body.occurredAt,
      note: body.note ?? null,
    });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
