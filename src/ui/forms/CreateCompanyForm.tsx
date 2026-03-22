"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/ui/components/Button";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Input } from "@/src/ui/components/Input";

export function CreateCompanyForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo crear la empresa");
        return;
      }

      const data = (await res.json().catch(() => null)) as { company?: { id?: string } } | null;
      const companyId = data?.company?.id;

      if (companyId) {
        // Hacemos la nueva empresa la activa para que el dashboard inmediatamente use ese contexto.
        await fetch("/api/companies/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ companyId }),
        }).catch(() => null);
      }

      if (companyId) {
        router.push(`/dashboard/onboarding?mode=EXISTING&companyId=${encodeURIComponent(companyId)}`);
      } else {
        router.push("/dashboard/onboarding");
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-extrabold">Crear empresa</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Se vinculará a tu cuenta.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input label="Nombre de la empresa" value={name} onChange={(e) => setName(e.target.value)} />

          {error ? (
            <p className="text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creando..." : "Crear"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/companies")}>
              Volver
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

