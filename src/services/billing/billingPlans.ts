import { env, requireStripePriceBusinessId, requireStripePriceProId } from "@/src/lib/env";

export type PlanCode = "FREE" | "PRO" | "BUSINESS";

export const billingPlans: Array<{
  code: PlanCode;
  label: string;
}> = [
  { code: "FREE", label: "Free" },
  { code: "PRO", label: "Pro" },
  { code: "BUSINESS", label: "Business" },
];

export function planCodeToStripePriceId(code: PlanCode): string | null {
  switch (code) {
    case "PRO":
      return requireStripePriceProId();
    case "BUSINESS":
      return requireStripePriceBusinessId();
    case "FREE":
      return null;
    default:
      return null;
  }
}

export function stripePriceIdToPlanCode(priceId: string | null): PlanCode {
  if (!priceId) return "FREE";
  const proId = env.STRIPE_PRICE_PRO_ID;
  const bizId = env.STRIPE_PRICE_BUSINESS_ID;
  if (proId && priceId === proId) return "PRO";
  if (bizId && priceId === bizId) return "BUSINESS";
  return "FREE";
}

