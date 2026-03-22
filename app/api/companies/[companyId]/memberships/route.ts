import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { addMemberToCompany, listCompanyMemberships } from "@/src/services/memberships/membershipsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

const bodySchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
});

export async function GET(
  _req: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    await requireUser();
    const params = await context.params;
    await requireCompanyPermission({
      companyId: params.companyId,
      permissionKey: "company.members.read",
    });
    const memberships = await listCompanyMemberships(params.companyId);
    return NextResponse.json({ memberships });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    await requireUser();
    const params = await context.params;
    await requireCompanyPermission({
      companyId: params.companyId,
      permissionKey: "company.members.manage",
    });

    const body = bodySchema.parse(await req.json());
    const membership = await addMemberToCompany({
      companyId: params.companyId,
      userId: body.userId,
      role: body.role,
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

