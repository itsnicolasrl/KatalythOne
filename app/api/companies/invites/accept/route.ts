import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { acceptCompanyInvite } from "@/src/services/invites/companyInvitesService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const bodySchema = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    enforceRateLimit({
      key: `invacc:${user.id}:${getClientIp(req)}`,
      max: 5,
      windowMs: 15 * 60 * 1000,
    });
    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const accepted = await acceptCompanyInvite({
      rawToken: body.token,
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ ok: true, ...accepted });
  } catch (err) {
    return toErrorResponse(err);
  }
}

