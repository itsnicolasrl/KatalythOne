import { NextResponse } from "next/server";

import { requireUser } from "@/src/api/auth/requireUser";
import { createBillingPortalUrl } from "@/src/services/billing/billingService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    enforceRateLimit({
      key: `billing-portal:${user.id}:${getClientIp(req)}`,
      max: 8,
      windowMs: 60 * 60 * 1000,
    });

    const url = await createBillingPortalUrl({ userId: user.id });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return toErrorResponse(err);
  }
}
