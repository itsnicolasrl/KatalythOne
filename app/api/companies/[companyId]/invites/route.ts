import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { listCompanyInvites, createCompanyInvite } from "@/src/services/invites/companyInvitesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

const bodySchema = z.object({
  email: z.string().email(),
  role: roleSchema,
  expiresInDays: z.coerce.number().int().min(1).max(30).optional(),
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
      permissionKey: "company.members.manage",
    });

    const invites = await listCompanyInvites({ companyId: params.companyId, take: 20 });
    return NextResponse.json({ invites });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    const params = await context.params;

    enforceRateLimit({
      key: `inv:${user.id}:${getClientIp(req)}`,
      max: 10,
      windowMs: 60 * 60 * 1000,
    });

    await requireCompanyPermission({
      companyId: params.companyId,
      permissionKey: "company.members.manage",
    });

    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const created = await createCompanyInvite({
      companyId: params.companyId,
      email: body.email,
      role: body.role,
      createdByUserId: user.id,
      expiresInDays: body.expiresInDays,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

