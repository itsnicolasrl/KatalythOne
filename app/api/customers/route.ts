import { NextResponse } from "next/server";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { createCustomerBodySchema } from "@/src/api/customers/customerSchemas";
import {
  createCustomer,
  listCustomers,
} from "@/src/services/customers/customersService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET() {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) {
      return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    }

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.customers.read",
    });

    const customers = await listCustomers(company.id);
    return NextResponse.json({ customers });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const company = await getActiveCompanyForRequest();
    if (!company) {
      return NextResponse.json({ error: "No hay empresa activa" }, { status: 400 });
    }

    await requireCompanyPermission({
      companyId: company.id,
      permissionKey: "company.customers.manage",
    });

    const body = createCustomerBodySchema.parse(await req.json());
    const customer = await createCustomer({ companyId: company.id, ...body });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

