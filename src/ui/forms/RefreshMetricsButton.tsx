"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/ui/components/Button";

export function RefreshMetricsButton({ periodDays = 30 }: { periodDays?: number }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ periodDays }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo refrescar");
        return;
      }

      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant="primary" onClick={onClick} disabled={loading}>
        {loading ? "Actualizando..." : "Actualizar snapshot"}
      </Button>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
          {error}
        </p>
      ) : null}
    </div>
  );
}

