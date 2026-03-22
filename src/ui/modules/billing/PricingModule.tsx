"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/src/ui/components/Card";
import { Button } from "@/src/ui/components/Button";

type BillingPlanCode = "FREE" | "PRO" | "BUSINESS";

type PricingModuleProps = {
  currentPlan: BillingPlanCode | null;
  authenticated: boolean;
  currency: string;
  proPrice: number | null; // unit amount in major units
  businessPrice: number | null; // unit amount in major units
};

function formatMoney(amount: number | null, currency: string) {
  if (amount === null) return "?";
  const formatted = amount.toFixed(2);
  return `${formatted} ${currency}`;
}

export function PricingModule(props: PricingModuleProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = React.useState<BillingPlanCode | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onChoose(plan: BillingPlanCode) {
    setError(null);
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudo actualizar plan");

      if (json && typeof json.redirectUrl === "string" && json.redirectUrl) {
        window.location.href = json.redirectUrl;
        return;
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoadingPlan(null);
    }
  }

  const currentPlanLabel =
    props.currentPlan === "FREE"
      ? "Free"
      : props.currentPlan === "PRO"
        ? "Pro"
        : props.currentPlan === "BUSINESS"
          ? "Business"
          : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-extrabold">Estado de suscripci?n</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {props.authenticated
            ? currentPlanLabel
              ? `Tu plan actual es ${currentPlanLabel}.`
              : "No se pudo determinar tu plan actual."
            : "Inicia sesi?n para ver y gestionar tu suscripci?n."}
        </p>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PlanCard
          title="Free"
          description="Para comenzar y estructurar tu modelo digital vivo."
          price="Gratis"
          features={["Onboarding base", "Alertas est?ndar", "Dashboards esenciales"]}
          current={props.authenticated && props.currentPlan === "FREE"}
          onChoose={() => void onChoose("FREE")}
          disabled={!props.authenticated || props.currentPlan === "FREE"}
          loading={loadingPlan === "FREE"}
          accent="#F25C05"
        />

        <PlanCard
          title="Pro"
          description="M?s an?lisis y recomendaciones con mejor cobertura."
          price={formatMoney(props.proPrice, props.currency)}
          features={["KPIs mensuales", "Recomendaciones basadas en an?lisis", "Flujo neto y margen por series"]}
          current={props.authenticated && props.currentPlan === "PRO"}
          onChoose={() => void onChoose("PRO")}
          disabled={!props.authenticated || props.currentPlan === "PRO"}
          loading={loadingPlan === "PRO"}
          accent="#F28705"
        />

        <PlanCard
          title="Business"
          description="Ejecuci?n avanzada y preparaci?n para crecimiento."
          price={formatMoney(props.businessPrice, props.currency)}
          features={["Simulaci?n financiera/operativa", "Alertas priorizadas", "Gesti?n de planes y estrategia"]}
          current={props.authenticated && props.currentPlan === "BUSINESS"}
          onChoose={() => void onChoose("BUSINESS")}
          disabled={!props.authenticated || props.currentPlan === "BUSINESS"}
          loading={loadingPlan === "BUSINESS"}
          accent="#F27405"
        />
      </div>

      <div className="text-sm text-foreground/70">Cambios de plan aplicados de forma directa en tu cuenta.</div>
    </div>
  );
}

function PlanCard(props: {
  title: string;
  description: string;
  price: string;
  features: string[];
  current: boolean;
  onChoose: () => void;
  disabled: boolean;
  loading: boolean;
  accent: string;
}) {
  return (
    <Card className={props.current ? "border-[#F28705]/40" : undefined}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold">{props.title}</h3>
            <p className="mt-1 text-sm text-foreground/70">{props.description}</p>
          </div>
          {props.current ? (
            <div className="text-xs font-extrabold text-foreground/80 rounded-xl border border-foreground/15 px-3 py-2">
              Actual
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-3xl font-extrabold">
          <span>{props.price}</span>
        </p>

        <ul className="mt-4 space-y-2 text-sm text-foreground/70">
          {props.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="mt-1 block h-2 w-2 rounded-full" style={{ backgroundColor: props.accent }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5">
          <Button
            className="w-full"
            style={{ backgroundColor: props.accent }}
            variant={props.current ? "outline" : "primary"}
            onClick={props.onChoose}
            disabled={props.disabled || props.loading}
          >
            {props.loading ? "Procesando..." : props.current ? "Plan actual" : "Elegir plan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

