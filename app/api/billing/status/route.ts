import { NextResponse } from "next/server";

import { requireUser } from "@/src/api/auth/requireUser";
import { getBillingStatusForUser } from "@/src/services/billing/billingService";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function GET() {
  try {
    const user = await requireUser();
    const status = await getBillingStatusForUser({ userId: user.id });
    return NextResponse.json(status);
  } catch (err) {
    return toErrorResponse(err);
  }
}

