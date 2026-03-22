import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createSupplier, listSuppliers } from "@/src/services/suppliers/suppliersService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(60).optional().nullable(),
  paymentTermsDays: z.coerce.number().int().min(0).optional().nullable(),
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

    const suppliers = await listSuppliers({ companyId: company.id });
    return NextResponse.json({ suppliers });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.expenses.manage",
    });

    const body = createSchema.parse(await req.json());
    const supplier = await createSupplier({
      companyId: company.id,
      name: body.name,
      contactName: body.contactName ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      paymentTermsDays: body.paymentTermsDays ?? null,
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

