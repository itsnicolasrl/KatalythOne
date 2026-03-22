import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { updateMemberRole, removeMemberFromCompany } from "@/src/services/memberships/membershipsService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

const bodySchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ companyId: string; userId: string }> },
) {
  try {
    await requireUser();
    const params = await context.params;
    await requireCompanyPermission({
      companyId: params.companyId,
      permissionKey: "company.members.manage",
    });

    const body = bodySchema.parse(await req.json());
    await updateMemberRole({
      companyId: params.companyId,
      userId: params.userId,
      role: body.role,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ companyId: string; userId: string }> },
) {
  try {
    await requireUser();
    const params = await context.params;
    await requireCompanyPermission({
      companyId: params.companyId,
      permissionKey: "company.members.manage",
    });

    await removeMemberFromCompany({
      companyId: params.companyId,
      userId: params.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

