"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { OnboardingChat } from "@/src/ui/onboarding/OnboardingChat";
import { OnboardingStrategicReport } from "@/src/ui/onboarding/OnboardingStrategicReport";

export function OnboardingWorkspace() {
  const router = useRouter();
  const [completed, setCompleted] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  function handleCompleted() {
    setCompleted(true);
    setRefreshKey((prev) => prev + 1);
    router.refresh();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4 h-full">

      <p className="text-xs text-black/45 px-1">
        Este es el único flujo conversacional del producto: sirve para registrar una empresa nueva o existente.
        El resto del análisis (informe, alertas, métricas) se calcula automáticamente desde tus datos.
      </p>

      {/* Layout: chat un poco más estrecho (~48/52), informe con algo más de espacio */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)] gap-5 min-h-0 xl:min-h-[calc(100dvh-9.5rem)]">

        {/* Asistente de alta — único chat del sistema */}
        <div className="flex flex-col min-h-0 h-full max-xl:min-h-[min(560px,70dvh)]">
          <OnboardingChat onCompleted={handleCompleted} />
        </div>

        {/* Informe estratégico — sticky en desktop */}
        <div className="flex flex-col min-h-0 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100dvh-9.5rem)] xl:overflow-y-auto space-y-4">
          {completed ? (
            <OnboardingStrategicReport refreshKey={refreshKey} />
          ) : (
            <div className="bg-[#0A0A0A] rounded-2xl p-6 relative overflow-hidden">
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  backgroundImage: `linear-gradient(rgba(242,135,5,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.07) 1px,transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />
              <div
                className="absolute right-0 bottom-0 w-40 h-40 pointer-events-none"
                style={{ background: "radial-gradient(circle at bottom right,rgba(242,135,5,0.2) 0%,transparent 70%)" }}
              />
              <div className="relative z-10">
                {/* Icono */}
                <div className="w-10 h-10 bg-[#F28705]/15 border border-[#F28705]/30 rounded-xl flex items-center justify-center mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
                  </svg>
                </div>

                <p className="text-sm font-black text-white mb-1">Informe estratégico inicial</p>
                <p className="text-xs text-white/40 leading-relaxed mb-5">
                  Completa el onboarding en el panel izquierdo para generar automáticamente el diagnóstico estratégico de tu empresa.
                </p>

                {/* Pasos pendientes */}
                <div className="space-y-2.5 mb-6">
                  {[
                    "Perfil de empresa y modelo de negocio",
                    "Clientes, ingresos y estructura de costos",
                    "Problemas prioritarios y objetivos",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-md border border-white/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-black text-white/30">{i + 1}</span>
                      </div>
                      <p className="text-[11px] text-white/40">{step}</p>
                    </div>
                  ))}
                </div>

                {/* Botón manual */}
                <button
                  onClick={() => { setCompleted(true); setRefreshKey((prev) => prev + 1); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 hover:border-white/25 hover:bg-white/5 transition-colors text-white/60 hover:text-white text-xs font-bold py-2.5"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Ya terminé, mostrar informe
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}