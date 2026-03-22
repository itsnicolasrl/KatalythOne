import { NextResponse } from "next/server";

import { requireUser } from "@/src/api/auth/requireUser";
import { requireCompanyPermission } from "@/src/api/auth/requireCompanyPermission";
import { revokeCompanyInvite } from "@/src/services/invites/companyInvitesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ companyId: string; inviteId: string }> },
) {
  try {
    requireSameOrigin(_req);
    const user = await requireUser();
    const params = await context.params;

    enforceRateLimit({
      key: `invdel:${user.id}:${getClientIp(_req)}`,
      max: 10,
      windowMs: 60 * 60 * 1000,
    });

    await requireCompanyPermission({
      companyId: params.companyId,
      permissionKey: "company.members.manage",
    });

    await revokeCompanyInvite({ companyId: params.companyId, inviteId: params.inviteId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

