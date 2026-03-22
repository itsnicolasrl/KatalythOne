import { getPrisma } from "@/src/db/prisma";
import type { BillingPlanCode } from "@/src/generated/prisma";

type PlanCode = "FREE" | "PRO" | "BUSINESS";

export async function getBillingStatusForUser(params: { userId: string }) {
  const prisma = getPrisma();
  const sub = await prisma.userSubscription.findUnique({
    where: { userId: params.userId },
    select: {
      planCode: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeStatus: true,
      currentPeriodEnd: true,
      canceledAt: true,
      updatedAt: true,
    },
  });

  return {
    planCode: sub?.planCode ?? ("FREE" as BillingPlanCode),
    stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
    stripeStatus: sub?.stripeStatus ?? "internal-card",
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    canceledAt: sub?.canceledAt ?? null,
  };
}

async function ensureUserSubscriptionRow(params: { userId: string }) {
  const prisma = getPrisma();
  const existing = await prisma.userSubscription.findUnique({
    where: { userId: params.userId },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.userSubscription.create({
    data: { userId: params.userId, planCode: "FREE" },
    select: { id: true },
  });
}

export async function changeUserPlan(params: {
  userId: string;
  targetPlan: PlanCode;
}): Promise<{ ok: true; redirectUrl: string | null }> {
  const prisma = getPrisma();
  await ensureUserSubscriptionRow({ userId: params.userId });
  await prisma.userSubscription.update({
    where: { userId: params.userId },
    data: {
      planCode: params.targetPlan as BillingPlanCode,
      stripeStatus: "internal-card",
      currentPeriodEnd: null,
      canceledAt: params.targetPlan === "FREE" ? new Date() : null,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
    },
  });

  return { ok: true, redirectUrl: null };
}

export async function createBillingPortalUrl(params: { userId: string }): Promise<string> {
  await ensureUserSubscriptionRow({ userId: params.userId });
  return "/dashboard/settings?billing=internal-card";
}

