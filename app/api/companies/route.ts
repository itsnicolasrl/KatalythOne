import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { createCompany, listCompaniesForUser } from "@/src/services/companies/companyService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
});

export async function GET() {
  try {
    const user = await requireUser();
    const companies = await listCompaniesForUser(user.id);
    return NextResponse.json({ companies });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const input = bodySchema.parse(body);
    const company = await createCompany({ userId: user.id, name: input.name });
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

