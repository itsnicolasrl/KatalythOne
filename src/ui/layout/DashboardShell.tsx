"use client";

import { Sidebar } from "@/src/ui/layout/Sidebar";
import type React from "react";
import { LogoutButton } from "@/src/ui/forms/LogoutButton";
import Link from "next/link";
import type { CompanySwitcherItem } from "@/src/ui/forms/CompanySwitcher";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const titleMap: Array<{ test: (h: string) => boolean; title: string; breadcrumb: string }> = [
  { test: (h) => h === "/dashboard" || h === "/dashboard/",          title: "Overview",    breadcrumb: "Dashboard › Overview" },
  { test: (h) => h.startsWith("/dashboard/customers"),               title: "Clientes",    breadcrumb: "Dashboard › Clientes" },
  { test: (h) => h.startsWith("/dashboard/revenues"),                title: "Ventas",      breadcrumb: "Dashboard › Ventas" },
  { test: (h) => h.startsWith("/dashboard/expenses"),                 title: "Gastos",      breadcrumb: "Dashboard › Gastos" },
  { test: (h) => h.startsWith("/dashboard/cashflow"),                title: "Flujo de caja", breadcrumb: "Dashboard › Flujo de caja" },
  { test: (h) => h.startsWith("/dashboard/inventory"),                 title: "Inventario", breadcrumb: "Dashboard › Inventario" },
  { test: (h) => h.startsWith("/dashboard/projects"),                 title: "Proyectos",   breadcrumb: "Dashboard › Proyectos" },
  { test: (h) => h.startsWith("/dashboard/tasks"),                   title: "Tareas",      breadcrumb: "Dashboard › Tareas" },
  { test: (h) => h.startsWith("/dashboard/operations"),              title: "Operaciones", breadcrumb: "Dashboard › Operaciones" },
  { test: (h) => h.startsWith("/dashboard/calendar"),                title: "Agenda",     breadcrumb: "Dashboard › Agenda" },
  { test: (h) => h.startsWith("/dashboard/purchases"),               title: "Compras",    breadcrumb: "Dashboard › Compras" },
  { test: (h) => h.startsWith("/dashboard/informe"),                 title: "Informe",     breadcrumb: "Dashboard › Informe" },
  { test: (h) => h.startsWith("/dashboard/metrics"),                 title: "Métricas",    breadcrumb: "Dashboard › Métricas" },
  { test: (h) => h.startsWith("/dashboard/alerts"),                  title: "Alertas",     breadcrumb: "Dashboard › Alertas" },
  { test: (h) => h.startsWith("/dashboard/simulacion"),              title: "Simulación",  breadcrumb: "Dashboard › Simulación" },
  { test: (h) => h.includes("/memberships"),                         title: "Roles",       breadcrumb: "Dashboard › Empresas › Roles" },
  { test: (h) => h.startsWith("/dashboard/companies/new"),           title: "Nueva empresa", breadcrumb: "Dashboard › Empresas › Nueva" },
  { test: (h) => h.startsWith("/dashboard/companies/") && h.includes("/onboarding"), title: "Onboarding", breadcrumb: "Dashboard › Empresas › Onboarding" },
  { test: (h) => h.startsWith("/dashboard/companies/"),              title: "Empresa",     breadcrumb: "Dashboard › Empresas › Detalle" },
  { test: (h) => h.startsWith("/dashboard/companies"),               title: "Empresas",    breadcrumb: "Dashboard › Empresas" },
  { test: (h) => h.startsWith("/dashboard/onboarding"),              title: "Onboarding",  breadcrumb: "Dashboard › Onboarding" },
  { test: (h) => h.startsWith("/dashboard/profile"),                 title: "Perfil",      breadcrumb: "Dashboard › Perfil" },
  { test: (h) => h.startsWith("/dashboard/settings"),                title: "Ajustes",     breadcrumb: "Dashboard › Ajustes" },
];

// Páginas disponibles para búsqueda
const searchPages = [
  { label: "Overview",     href: "/dashboard",             description: "Resumen general" },
  { label: "Informe",      href: "/dashboard/informe",     description: "Análisis automático con datos de la empresa" },
  { label: "Onboarding empresa", href: "/dashboard/onboarding", description: "Alta de empresa nueva o existente (asistente)" },
  { label: "Empresas",     href: "/dashboard/companies",   description: "Gestionar empresas" },
  { label: "Clientes",     href: "/dashboard/customers",   description: "Gestión de clientes" },
  { label: "Flujo de caja", href: "/dashboard/cashflow",   description: "Entradas, salidas y saldo" },
  { label: "Ventas",       href: "/dashboard/revenues",    description: "Ingresos y facturación" },
  { label: "Gastos",       href: "/dashboard/expenses",    description: "Egresos y categorías" },
  { label: "Operaciones",  href: "/dashboard/operations",  description: "Vista operativa central" },
  { label: "Proyectos",    href: "/dashboard/projects",    description: "Ejecución de iniciativas" },
  { label: "Tareas",       href: "/dashboard/tasks",       description: "Seguimiento operativo diario" },
  { label: "Agenda",       href: "/dashboard/calendar",    description: "Calendario empresarial" },
  { label: "Compras",      href: "/dashboard/purchases",   description: "Proveedores y órdenes de compra" },
  { label: "Inventario",   href: "/dashboard/inventory",   description: "Productos, stock y movimientos" },
  { label: "Métricas",     href: "/dashboard/metrics",     description: "KPIs y crecimiento" },
  { label: "Alertas",      href: "/dashboard/alerts",      description: "Alertas y diagnósticos" },
  { label: "Simulación",   href: "/dashboard/simulacion",  description: "Proyección de decisiones" },
  { label: "Ajustes",      href: "/dashboard/settings",    description: "Preferencias y cuenta" },
];

export function DashboardShell(props: {
  children: React.ReactNode;
  companyName?: string | null;
  activeCompanyId?: string | null;
  companies?: CompanySwitcherItem[];
  activeHref?: string;
  openAlertsCount?: number;
  /** Si false, se oculta onboarding en sidebar y búsqueda (ya culminado para la empresa activa). */
  showOnboardingNav?: boolean;
}) {
  const href = props.activeHref ?? "";
  const match = titleMap.find((m) => m.test(href));
  const activeTitle = match?.title ?? "Dashboard";
  const breadcrumb = match?.breadcrumb ?? "Dashboard";

  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showOnboarding = props.showOnboardingNav !== false;
  const searchablePages = showOnboarding
    ? searchPages
    : searchPages.filter((p) => p.href !== "/dashboard/onboarding");

  const filtered = query.trim().length > 0
    ? searchablePages.filter(
        (p) =>
          p.label.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      )
    : searchablePages;

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(pageHref: string) {
    setSearchOpen(false);
    setQuery("");
    router.push(pageHref);
  }

  return (
    <div className="h-screen flex bg-[#F5F4F2] overflow-hidden">
      <Sidebar
        activeHref={props.activeHref}
        openAlertsCount={props.openAlertsCount}
        showOnboardingNav={showOnboarding}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}     
        <header className="flex items-center bg-white border-b border-black/[0.05] min-h-[60px] px-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-black/35 font-medium mb-0.5">{breadcrumb}</p>
            <h1 className="text-xl font-black text-black leading-none tracking-tight">{activeTitle}</h1>
          </div>

          <div className="flex items-center gap-2">

            {/* Search con dropdown */}
            <div ref={searchRef} className="relative hidden md:block">
              <div
                className="flex items-center gap-2 bg-[#F5F4F2] hover:bg-black/[0.06] rounded-lg px-3 py-2 text-xs text-black/40 w-48 cursor-text transition-colors"
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                {searchOpen ? (
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar sección..."
                    className="bg-transparent outline-none text-black/80 placeholder:text-black/30 w-full text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setSearchOpen(false); setQuery(""); }
                      if (e.key === "Enter" && filtered.length > 0) handleSelect(filtered[0].href);
                    }}
                  />
                ) : (
                  <span>Buscar...</span>
                )}
                <kbd className="ml-auto text-[9px] text-black/20 font-medium">⌘K</kbd>
              </div>

              {/* Dropdown resultados */}
              {searchOpen && (
                <div className="absolute top-full mt-1.5 left-0 w-64 bg-white rounded-xl border border-black/[0.08] shadow-xl shadow-black/10 overflow-hidden z-50">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-black/40">
                      Sin resultados para "{query}"
                    </div>
                  ) : (
                    <div className="py-1.5">
                      {filtered.map((page) => {
                        const isCurrentPage = href === page.href || href.startsWith(page.href + "/");
                        return (
                          <button
                            key={page.href}
                            onClick={() => handleSelect(page.href)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F5F4F2] transition-colors text-left"
                          >
                            <div className={[
                              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                              isCurrentPage ? "bg-[#F28705]" : "bg-black/[0.05]",
                            ].join(" ")}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                stroke={isCurrentPage ? "white" : "rgba(0,0,0,0.4)"}
                                strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6"/>
                              </svg>
                            </div>
                            <div>
                              <p className={[
                                "text-xs font-bold",
                                isCurrentPage ? "text-[#F28705]" : "text-black",
                              ].join(" ")}>
                                {page.label}
                                {isCurrentPage && <span className="ml-1.5 text-[9px] font-black bg-[#FFF3E0] text-[#F28705] px-1.5 py-0.5 rounded-full">actual</span>}
                              </p>
                              <p className="text-[10px] text-black/40">{page.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Campana de alertas */}
            <Link
              href="/dashboard/alerts"
              className="relative w-8 h-8 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.06] flex items-center justify-center transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
              {props.openAlertsCount ? (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F28705] text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {props.openAlertsCount > 9 ? "9+" : props.openAlertsCount}
                </span>
              ) : null}
            </Link>

            <LogoutButton />
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6">
          {props.children}
        </main>

      </div>
    </div>
  );
}