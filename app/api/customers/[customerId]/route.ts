import { NextResponse } from "next/server";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { updateCustomerBodySchema } from "@/src/api/customers/customerSchemas";
import {
  getCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/src/services/customers/customersService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET(
  _req: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.customers.read",
    });

    const customer = await getCustomer(company.id, params.customerId);
    return NextResponse.json({ customer });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.customers.manage",
    });

    const body = updateCustomerBodySchema.parse(await req.json());
    const customer = await updateCustomer({
      companyId: company.id,
      customerId: params.customerId,
      input: body,
    });
    return NextResponse.json({ customer });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    const params = await context.params;

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.customers.manage",
    });

    await deleteCustomer({ companyId: company.id, customerId: params.customerId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

