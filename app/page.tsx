import Link from "next/link";
import {
  AlertTriangle, Building2, ClipboardList, FileBarChart2,
  Gauge, Lightbulb, Layers3, LineChart,
  Search, SlidersHorizontal, TrendingUp, Users, CheckCircle2,
} from "lucide-react";
import { FeatureCard } from "@/src/ui/landing/FeatureCard";
import { Footer } from "@/src/ui/landing/Footer";
import { Hero } from "@/src/ui/landing/Hero";
import { Navbar } from "@/src/ui/landing/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <Hero />

      {/* ── STATS BAND ── */}
      <div className="bg-black">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {[
            { n: "5+",   l: "módulos integrados" },
            { n: "1",    l: "modelo por empresa" },
            { n: "24/7", l: "monitoreo de alertas" },
            { n: "100%", l: "datos reales" },
          ].map(({ n, l }) => (
            <div key={l} className="py-8 text-center px-6">
              <p className="text-4xl md:text-5xl font-black text-[#F28705]">{n}</p>
              <p className="mt-1.5 text-xs text-white/40 font-medium">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEMA ── */}
      <section id="problema" className="bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">El problema</span>
              <h2 className="mt-3 text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-black">
                Las empresas fallan por falta de estructura
              </h2>
              <p className="mt-5 text-lg text-black/50 leading-relaxed">
                Sin un modelo operativo claro, el negocio se vuelve reactivo: decisiones
                tardías, costos sin control, crecimiento inestable.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { icon: AlertTriangle, t: "Desorganización operativa",   d: "Procesos dispersos que impiden ejecutar con consistencia." },
                { icon: ClipboardList, t: "Falta de control financiero", d: "Gastos e ingresos sin trazabilidad hacia decisiones." },
                { icon: Search,        t: "Decisiones sin datos",        d: "Ausencia de métricas y diagnósticos accionables." },
                { icon: Building2,     t: "Dificultad para crecer",      d: "Crecimiento que no escala por falta de estructura." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex items-start gap-4 rounded-2xl bg-white border border-black/[0.07] p-5">
                  <div className="h-10 w-10 rounded-xl bg-[#FFF3E0] border border-[#F28705]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-[#F28705]" />
                  </div>
                  <div>
                    <p className="font-black text-black">{t}</p>
                    <p className="mt-1 text-sm text-black/50">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLUCIÓN ── */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">La solución</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-black max-w-xl">
            Control total sobre tu negocio
          </h2>
          <p className="mt-4 text-lg text-black/50 leading-relaxed max-w-lg">
            Un modelo digital vivo: mide, diagnostica y recomienda con impacto estimado.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <FeatureCard icon={Layers3}       title="Estructura empresarial"     description="Onboarding inteligente y modelo operativo listo para ejecutar." />
            <FeatureCard icon={ClipboardList} title="Gestión centralizada"       description="Clientes, ingresos, gastos en un contexto único por empresa." />
            <FeatureCard icon={LineChart}     title="Análisis de negocio"        description="Rentabilidad y métricas automáticas por período." />
            <FeatureCard icon={Lightbulb}     title="Recomendaciones IA"         description="Alertas accionables con causa y efecto estimado." />
          </div>
        </div>
      </section>

      {/* ── VISTA DE PRODUCTO ── */}
      <section className="bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">Vista del producto</span>
              <h2 className="mt-3 text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-black">
                Una interfaz para decidir rápido
              </h2>
              <p className="mt-4 text-lg text-black/50 leading-relaxed">
                Tableros claros, jerarquía visual sólida y navegación enfocada en operación real.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                {[
                  "Dashboard ejecutivo con KPIs en tiempo real",
                  "Alertas priorizadas por impacto financiero",
                  "Recomendaciones con causa y efecto estimado",
                  "Contexto completamente aislado por empresa",
                ].map((t) => (
                  <div key={t} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FFF3E0] border border-[#F28705]/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-[#F28705]" />
                    </div>
                    <span className="text-sm font-semibold text-black/65">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-black/[0.07] bg-white shadow-xl shadow-black/[0.04] p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#F28705]">Dashboard ejecutivo</p>
                    <p className="mt-1 text-base font-black text-black">Resumen financiero y operativo</p>
                  </div>
                  <span className="text-xs font-bold text-[#F28705]">✦ IA activa</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { l: "Ingresos", v: "35,340", d: "+3.2% mensual" },
                    { l: "Gastos",   v: "9,845",  d: "-2.1% mensual" },
                    { l: "Margen",   v: "18.42%", d: "estable" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-2xl border border-black/[0.06] bg-[#FAFAFA] p-4">
                      <p className="text-[10px] font-bold text-black/40">{k.l}</p>
                      <p className="mt-1.5 text-xl font-black text-black">{k.v}</p>
                      <p className="mt-1 text-[11px] font-bold text-[#F28705]">{k.d}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-black/[0.06] bg-[#FAFAFA] p-4 mb-4">
                  <div className="flex items-end gap-1 h-28">
                    {[40,55,35,70,60,80,65,90,75,95,85,100].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t"
                        style={{ height:`${h}%`, background: i===11?"#F28705":`rgba(242,135,5,${0.08+i*0.05})` }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { t: "Alertas priorizadas",    d: "Riesgos financieros, caída de ventas y dependencia de clientes." },
                    { t: "Recomendaciones accionables", d: "Cada una explica el problema, la causa y el impacto esperado." },
                  ].map((r) => (
                    <div key={r.t} className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-4">
                      <p className="text-sm font-black text-black">{r.t}</p>
                      <p className="mt-1 text-xs text-black/50">{r.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section id="como-funciona" className="bg-white">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">Cómo funciona</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-black max-w-xl">
            De idea a empresa operativa en 4 pasos
          </h2>
          <p className="mt-4 text-lg text-black/50 leading-relaxed max-w-lg">
            Sin plantillas genéricas: el sistema construye tu modelo con tus datos.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", icon: Building2,     t: "Registra tu empresa",     d: "Crea tu espacio y define el contexto inicial del negocio." },
              { n: "02", icon: Layers3,       t: "El sistema la estructura", d: "Convierte tu información en un modelo completamente operable." },
              { n: "03", icon: ClipboardList, t: "Opera tu negocio",         d: "Clientes, ventas y gastos en un único flujo de trabajo." },
              { n: "04", icon: LineChart,     t: "Mejora con análisis",      d: "Métricas, diagnósticos y recomendaciones con evidencia real." },
            ].map(({ n, icon: Icon, t, d }) => (
              <div key={n} className="rounded-2xl border border-black/[0.07] bg-white p-6">
                <p className="text-4xl font-black text-[#F28705]/20 mb-4 leading-none">{n}</p>
                <div className="h-10 w-10 rounded-xl bg-[#FFF3E0] border border-[#F28705]/20 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-[#F28705]" />
                </div>
                <p className="font-black text-black">{t}</p>
                <p className="mt-2 text-sm text-black/50">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES dark ── */}
      <section id="funcionalidades" className="bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">Funcionalidades</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-white max-w-xl">
            Todo para operar, medir y decidir
          </h2>
          <p className="mt-4 text-lg text-white/40 leading-relaxed max-w-lg">
            Módulos para que tu empresa sea medible y mejorable en cada ciclo.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <FeatureCard dark icon={Users}             title="Gestión de clientes"    description="Historial, valor y contexto de cada cliente dentro del modelo." />
            <FeatureCard dark icon={Gauge}             title="Finanzas"               description="Flujo de caja, margen y trazabilidad completa de ingresos." />
            <FeatureCard dark icon={LineChart}         title="Métricas"               description="KPIs mensuales de crecimiento, retención y rentabilidad." />
            <FeatureCard dark icon={Search}            title="Análisis inteligente"   description="Diagnósticos basados en señales reales del negocio." />
            <FeatureCard dark icon={SlidersHorizontal} title="Simulación"             description="Proyecta el impacto antes de ejecutar cualquier cambio." />
            <FeatureCard dark icon={FileBarChart2}     title="Reportes ejecutivos"    description="Estado actual, evolución y focos de intervención." />
          </div>
        </div>
      </section>

      {/* ── POR QUÉ KATALYTH ── */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">Por qué Katalyth</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-black max-w-xl">
            Diseñado para empresas reales
          </h2>
          <p className="mt-4 text-lg text-black/50 leading-relaxed max-w-lg">
            Una plataforma de trabajo diario para dueños que necesitan estructura, velocidad y claridad.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, t: "Orientado a crecimiento",     d: "Del onboarding a la operación, cada módulo está pensado para decisiones de escala." },
              { icon: Users,      t: "Multiusuario y multiempresa", d: "Opera varias empresas con contexto de datos completamente independiente." },
              { icon: Gauge,      t: "Métricas que explican",       d: "No solo muestra números: interpreta causas y recomienda acciones concretas." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-black/[0.07] bg-white p-6">
                <div className="h-11 w-11 rounded-2xl bg-[#FFF3E0] border border-[#F28705]/20 flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5 text-[#F28705]" />
                </div>
                <p className="text-lg font-black text-black">{t}</p>
                <p className="mt-2 text-sm text-black/50 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-4">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">FAQ</span>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-black">
                Preguntas frecuentes
              </h2>
              <p className="mt-4 text-base text-black/50 leading-relaxed">
                Respuestas directas para evaluar la plataforma antes de implementarla.
              </p>
            </div>
            <div className="lg:col-span-8 flex flex-col gap-3">
              {[
                { q: "¿Katalyth One reemplaza mi CRM o ERP?",             a: "No. Funciona como sistema operativo empresarial: estructura, integra y analiza tu negocio para que puedas decidir mejor." },
                { q: "¿Puedo gestionar varias empresas con un usuario?",   a: "Sí. Múltiples empresas por usuario con contexto de datos completamente independiente en cada una." },
                { q: "¿Las recomendaciones usan datos reales?",            a: "Sí. El motor usa snapshots y señales del negocio para construir diagnósticos y recomendaciones trazables." },
                { q: "¿Necesito conocimientos técnicos para empezar?",     a: "No. El onboarding guiado construye tu modelo empresarial con tus respuestas. Sin configuraciones complicadas." },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-black/[0.07] bg-white p-6">
                  <p className="font-black text-black">{q}</p>
                  <p className="mt-3 text-sm text-black/50 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="precios" className="bg-white">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#F28705]">Precios</span>
              <h2 className="mt-2 text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-black">
                Planes para cada etapa
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-full p-1 w-fit">
              <button className="text-xs font-bold text-black bg-white px-4 py-1.5 rounded-full shadow-sm">
                Mensual
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-black/40 px-4 py-1.5 rounded-full">
                Anual
                <span className="bg-[#F28705] text-white text-[9px] font-black px-2 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="rounded-3xl border border-black/[0.08] p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-black/30 mb-4">Free</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-black tracking-tight">$0</span>
                <span className="text-sm text-black/35 mb-1.5">/ mes</span>
              </div>
              <div className="h-px bg-black/[0.06] my-5" />
              <div className="flex flex-col gap-3 mb-7">
                {["Onboarding empresarial","Gestión base de clientes","Panel inicial de métricas"].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-black/55">
                    <div className="w-[18px] h-[18px] rounded-full bg-black/[0.04] flex items-center justify-center flex-shrink-0">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/register">
                <button className="w-full rounded-full border border-black/10 py-3 text-sm font-bold text-black hover:border-black/25 transition-colors">
                  Comenzar gratis
                </button>
              </Link>
            </div>

            {/* Pro — dark */}
            <div className="rounded-3xl bg-[#0A0A0A] p-7 relative shadow-2xl shadow-black/20">
              <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-[#F28705] text-white text-[10px] font-black px-4 py-1 rounded-b-xl tracking-wide whitespace-nowrap">
                MÁS POPULAR
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/25 mb-4">Pro</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-white tracking-tight">$49</span>
                <span className="text-sm text-white/30 mb-1.5">/ mes</span>
              </div>
              <div className="h-px bg-white/[0.08] my-5" />
              <div className="flex flex-col gap-3 mb-7">
                {["KPIs mensuales avanzados","Diagnóstico inteligente","Recomendaciones estratégicas"].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-white/55">
                    <div className="w-[18px] h-[18px] rounded-full bg-[#F28705]/15 flex items-center justify-center flex-shrink-0">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#F28705" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/register">
                <button className="w-full rounded-full bg-[#F28705] py-3 text-sm font-bold text-white shadow-lg shadow-[#F28705]/30 hover:bg-[#F25C05] transition-colors">
                  Elegir Pro
                </button>
              </Link>
            </div>

            {/* Business */}
            <div className="rounded-3xl border border-black/[0.08] p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-black/30 mb-4">Business</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-5xl font-black text-black tracking-tight">$99</span>
                <span className="text-sm text-black/35 mb-1.5">/ mes</span>
              </div>
              <div className="h-px bg-black/[0.06] my-5" />
              <div className="flex flex-col gap-3 mb-7">
                {["Simulación de decisiones","Multiempresa completa","Soporte prioritario"].map((f) => (
                  <div key={f} className="flex items-center gap-3 text-sm text-black/55">
                    <div className="w-[18px] h-[18px] rounded-full bg-black/[0.04] flex items-center justify-center flex-shrink-0">
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="rgba(0,0,0,0.3)" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>
              <Link href="/register">
                <button className="w-full rounded-full border border-black/10 py-3 text-sm font-bold text-black hover:border-black/25 transition-colors">
                  Elegir Business
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-[#0A0A0A] py-24 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(242,135,5,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(242,135,5,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(242,135,5,0.18) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-5 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 border border-[#F28705]/35 bg-[#F28705]/[0.08] rounded-full px-4 py-1.5 text-xs font-bold text-[#F28705] mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
            Empieza hoy — es gratis
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white leading-[1.0] tracking-tight mb-6">
            Tu empresa,<br />
            estructurada con{" "}
            <span className="text-[#F28705] relative inline-block">
              datos reales
              <span className="absolute bottom-1 left-0 right-0 h-[3px] bg-[#F28705]/40 rounded-full" />
            </span>
          </h2>
          <p className="text-lg text-white/40 leading-relaxed max-w-lg mb-10">
            Crea tu cuenta en minutos. Sin tarjeta de crédito, sin configuraciones
            complicadas. Solo tu negocio, organizado.
          </p>
          <Link href="/register">
            <button className="flex items-center gap-3 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-base font-black px-8 py-4 rounded-full shadow-[0_0_0_1px_#F28705,0_8px_40px_rgba(242,135,5,0.4)]">
              Crear cuenta gratis
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">→</span>
            </button>
          </Link>
          <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 mt-7">
            {["Sin tarjeta de crédito","Plan gratuito permanente","Cancela cuando quieras"].map((g, i) => (
              <div key={g} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/15 text-xs">·</span>}
                <div className="flex items-center gap-1.5 text-xs text-white/25">
                  <div className="w-3.5 h-3.5 rounded-full border border-white/15 flex items-center justify-center">
                    <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  {g}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}