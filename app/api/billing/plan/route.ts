import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/src/api/auth/requireUser";
import { changeUserPlan } from "@/src/services/billing/billingService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";
import { enforceRateLimit, getClientIp } from "@/src/api/http/rateLimit";
import { requireSameOrigin } from "@/src/api/http/originCheck";

const bodySchema = z.object({
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
});

export async function POST(req: Request) {
  try {
    requireSameOrigin(req);
    const user = await requireUser();
    enforceRateLimit({
      key: `billing:${user.id}:${getClientIp(req)}`,
      max: 5,
      windowMs: 60 * 60 * 1000,
    });
    const body = bodySchema.parse(await req.json().catch(() => ({})));

    const result = await changeUserPlan({
      userId: user.id,
      targetPlan: body.plan,
    });

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

