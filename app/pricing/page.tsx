import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { getBillingStatusForUser } from "@/src/services/billing/billingService";
import { PricingModule } from "@/src/ui/modules/billing/PricingModule";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();

  const status = user
    ? await getBillingStatusForUser({ userId: user.id }).catch(() => ({
        planCode: "FREE" as const,
      }))
    : null;

  const currency = "USD";
  const proPrice = 29;
  const businessPrice = 79;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-surface-muted text-foreground px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <h1 className="text-3xl font-extrabold">Planes</h1>
          <p className="text-sm text-muted-foreground">
            Elige el plan que mejor se adapta a tu crecimiento. Tus métricas y diagnósticos usan datos reales de tu empresa.
          </p>
        </div>

        <div className="mt-10">
          <PricingModule
            currentPlan={status?.planCode ?? null}
            authenticated={Boolean(user)}
            currency={currency}
            proPrice={proPrice}
            businessPrice={businessPrice}
          />
        </div>
      </div>
    </div>
  );
}

