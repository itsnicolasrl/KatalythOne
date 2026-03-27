"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ExecutiveReport } from "@/src/services/analytics/executiveReportService";

type Recommendation = ExecutiveReport["recommendations"][number];

function typeLabel(type: string) {
  switch (type) {
    case "FINANCIAL_RISK":
      return "Riesgo financiero";
    case "SALES_FALL":
      return "Caída de ventas";
    case "CUSTOMER_DEPENDENCE":
      return "Dependencia de clientes";
    case "REVENUE_ZERO":
      return "Ingresos nulos";
    case "LOW_PROFITABILITY":
      return "Baja rentabilidad";
    case "COSTS_EXCESSIVE":
      return "Costos elevados";
    case "NEGATIVE_GROWTH":
      return "Crecimiento negativo";
    case "OPERATIONAL_DISORDER":
      return "Operación";
    case "ONBOARDING_PROBLEM":
      return "Onboarding";
    default:
      return type;
  }
}

export function ExecutiveRecommendationsModule(props: { recommendations: Recommendation[] }) {
  const router = useRouter();
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [aiResponse, setAiResponse] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);

  async function onAccept(recommendationId: string) {
    setAcceptingId(recommendationId);
    setStatus(null);
    try {
      const res = await fetch(`/api/recommendations/${recommendationId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; alreadyAccepted?: boolean; project?: { name?: string } }
        | null;

      if (!res.ok) {
        throw new Error(json?.error ?? "No se pudo aceptar la recomendación");
      }

      setStatus({
        ok: true,
        message: json?.alreadyAccepted
          ? "Ya habías aceptado esta recomendación. Proyecto existente."
          : `Proyecto generado automáticamente${json?.project?.name ? `: "${json.project.name}"` : ""}.`,
      });

      // Refresca snapshot/recommendations para que el usuario vea el estado actualizado.
      router.refresh();
    } catch (e) {
      setStatus({
        ok: false,
        message: e instanceof Error ? e.message : "Error de red",
      });
    } finally {
      setAcceptingId(null);
    }
  }

  async function onAskAi() {
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch(`/api/ai/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "¿Cuáles son las tres acciones de mayor impacto que debería tomar esta empresa?" }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "No se pudo obtener respuesta de IA");
      }
      setAiResponse(json.answer ?? "No hay respuesta");
    } catch (e) {
      setAiResponse(e instanceof Error ? e.message : "Error de red");
    } finally {
      setAiLoading(false);
    }
  }

  const fmtImpact = (impact: number | null, currency: string) => {
    if (impact == null) return null;
    return `${(impact / 100).toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={aiLoading}
          onClick={() => void onAskAi()}
          className={[
            "rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 transition-colors",
            aiLoading ? "opacity-60 cursor-not-allowed" : "",
          ].join(" ")}
        >
          {aiLoading ? "Consultando IA..." : "Consulta rápida de IA"}
        </button>
        <p className="text-[10px] text-black/40">Basado en histórico y documentación interna de la empresa.</p>
      </div>

      {aiResponse && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
          <strong>Respuesta IA:</strong>
          <p className="mt-1 whitespace-pre-line">{aiResponse}</p>
        </div>
      )}

      {props.recommendations.length === 0 ? (
        <p className="text-sm text-black/45 py-4 text-center">Sin recomendaciones en el último análisis.</p>
      ) : (
        <>
          {status && (
            <div
              className={[
                "rounded-xl px-4 py-3 text-sm",
                status.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800",
              ].join(" ")}
            >
              {status.message}
            </div>
          )}

          <ul className="space-y-3">
            {props.recommendations.map((r) => (
              <li key={r.id} className="rounded-xl border border-black/[0.06] bg-[#F5F4F2] p-4 text-sm">
                {r.alertType && (
                  <p className="text-[9px] font-black text-[#F28705] uppercase mb-1">{typeLabel(r.alertType)}</p>
                )}
                <p className="font-black text-black">{r.problema}</p>

                {r.accion && <p className="text-xs text-black/60 mt-2 leading-relaxed">{r.accion}</p>}

                {r.impacto != null && r.currency && (
                  <p className="text-[10px] font-bold text-emerald-700 mt-2">
                    Impacto estimado: +{fmtImpact(r.impacto, r.currency)}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-4 items-center">
                  <button
                    type="button"
                    disabled={acceptingId === r.id}
                    onClick={() => void onAccept(r.id)}
                    className={[
                      "rounded-xl bg-[#F28705] hover:bg-[#F25C05] text-white text-xs font-bold px-4 py-2 transition-colors",
                      acceptingId === r.id ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {acceptingId === r.id ? "Generando..." : "Aceptar"}
                  </button>
                  <p className="text-[10px] text-black/40">
                    Al aceptar se crea automáticamente un proyecto y tareas.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

