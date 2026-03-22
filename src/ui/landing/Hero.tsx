import Link from "next/link";
import { Building2 } from "lucide-react";

export function Hero() {
  return (
    <section className="bg-white relative overflow-hidden border-b border-black/6">
      {/* Fondo decorativo sutil */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#F28705]/5 blur-3xl -translate-y-1/3 translate-x-1/3" />

      <div className="max-w-6xl mx-auto px-5 pt-16 pb-14 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Texto */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F28705]/30 bg-[#F28705]/8 px-3 py-1 text-xs font-bold text-[#F28705] mb-6">
              Sistema operativo empresarial
            </span>
            <h1 className="text-5xl md:text-6xl font-black text-black leading-[1.0] tracking-tight">
              Convierte tu<br />
              <span className="text-[#F28705]">empresa</span><br />
              en datos reales
            </h1>
            <p className="mt-6 text-lg text-black/60 leading-relaxed max-w-xl">
              Estructura, opera, analiza y mejora tu negocio desde una sola plataforma. Sin plantillas genéricas.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/register">
                <button className="rounded-full bg-[#F28705] hover:bg-[#F25C05] transition-colors px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#F28705]/25">
                  Crear cuenta gratis
                </button>
              </Link>
              <a href="#como-funciona">
                <button className="rounded-full border border-black/15 hover:border-black/30 transition-colors px-7 py-3.5 text-sm font-bold text-black">
                  Ver cómo funciona
                </button>
              </a>
            </div>

            {/* Mini stats */}
            <div className="mt-10 flex items-center gap-8">
              {[["5+","módulos"],["24/7","alertas"],["100%","datos reales"]].map(([num, label]) => (
                <div key={label}>
                  <p className="text-2xl font-black text-black">{num}</p>
                  <p className="text-xs text-black/50 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard mock */}
          <div className="lg:pl-4">
            <div className="rounded-3xl border border-black/8 bg-[#FAFAFA] shadow-xl shadow-black/5 p-5">
              {/* Header mock */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#F28705]/15 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-[#F28705]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-black">Dashboard</p>
                    <p className="text-[10px] text-black/40">Vista ejecutiva</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-black/10" />
                  <div className="h-2 w-2 rounded-full bg-black/10" />
                  <div className="h-2 w-2 rounded-full bg-[#F28705]" />
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                {[
                  { label: "Ingresos", val: "35.3K", up: true },
                  { label: "Margen", val: "18.4%", up: true },
                  { label: "Alertas", val: "3", up: false },
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl bg-white border border-black/6 p-3">
                    <p className="text-[10px] font-bold text-black/40">{k.label}</p>
                    <p className="mt-1 text-lg font-black text-black">{k.val}</p>
                    <div className={`mt-1 text-[10px] font-bold ${k.up ? "text-[#F28705]" : "text-black/30"}`}>
                      {k.up ? "↑ creciendo" : "● revisar"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart placeholder */}
              <div className="rounded-2xl bg-white border border-black/6 p-4 mb-3">
                <div className="flex items-end gap-1.5 h-20">
                  {[40,55,35,70,60,80,65,90,75,95,85,100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        background: i === 11 ? "#F28705" : `rgba(242,135,5,${0.1 + i * 0.06})`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {["Ene","Mar","May","Jul","Sep","Nov"].map(m => (
                    <span key={m} className="text-[9px] text-black/30 font-medium">{m}</span>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                {[
                  { text: "Concentración en 2 clientes: riesgo de dependencia", dot: "#F25C05" },
                  { text: "Margen estable — mantener estructura de costos", dot: "#F28705" },
                ].map((r) => (
                  <div key={r.text} className="flex items-start gap-2.5 rounded-xl bg-white border border-black/6 p-3">
                    <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: r.dot }} />
                    <p className="text-[11px] text-black/60 font-medium leading-snug">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-black/6 bg-[#FCFCFC]">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <p className="text-center text-[clamp(1rem,2vw,1.75rem)] font-black tracking-tight text-black/80">
            Confiado por empresas que operan con datos reales
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-bold text-black/40">
            <span>Katalyth Studio</span>
            <span>AceroLab</span>
            <span>Nova Brands</span>
            <span>Delta Trade</span>
            <span>Nexo Group</span>
          </div>
        </div>
      </div>
    </section>
  );
}