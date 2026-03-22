"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/ui/components/Button";

export type CompanySwitcherItem = {
  companyId: string;
  companyName: string;
  role: string;
};

export function CompanySwitcher(props: {
  items: CompanySwitcherItem[];
  activeCompanyId: string | null;
}) {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = React.useState(
    props.activeCompanyId ?? props.items[0]?.companyId ?? "",
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedCompanyId(props.activeCompanyId ?? props.items[0]?.companyId ?? "");
  }, [props.activeCompanyId, props.items]);

  async function onApply() {
    if (!selectedCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/companies/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId: selectedCompanyId }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo cambiar la empresa activa");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  if (props.items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground/70">
        Sin empresas
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          className="h-10 min-w-[220px] rounded-xl border border-border bg-surface px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          disabled={loading}
        >
          {props.items.map((item) => (
            <option key={item.companyId} value={item.companyId}>
              {item.companyName} ({item.role})
            </option>
          ))}
        </select>
        <Button
          variant="primary"
          size="sm"
          disabled={loading || !selectedCompanyId || selectedCompanyId === props.activeCompanyId}
          onClick={() => void onApply()}
        >
          {loading ? "Cambiando..." : "Cambiar"}
        </Button>
      </div>
      {error ? <p className="text-xs font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

