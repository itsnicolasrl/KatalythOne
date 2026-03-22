"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  matchPrefixes: string[];
  exact?: boolean;
  /** Muestra badge con openAlertsCount */
  alertsBadge?: boolean;
  icon: ReactNode;
};

const navSections: { section: string; items: NavItem[] }[] = [
  {
    section: "Inicio",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        matchPrefixes: ["/dashboard"],
        exact: true,
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Organización",
    items: [
      {
        href: "/dashboard/companies",
        label: "Empresas",
        matchPrefixes: ["/dashboard/companies"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
            <line x1="9" y1="9" x2="9" y2="9.01" />
            <line x1="9" y1="12" x2="9" y2="12.01" />
            <line x1="9" y1="15" x2="9" y2="15.01" />
            <line x1="9" y1="18" x2="9" y2="18.01" />
          </svg>
        ),
      },
      {
        href: "/dashboard/customers",
        label: "Clientes",
        matchPrefixes: ["/dashboard/customers"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Finanzas",
    items: [
      {
        href: "/dashboard/cashflow",
        label: "Flujo de caja",
        matchPrefixes: ["/dashboard/cashflow"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        ),
      },
      {
        href: "/dashboard/revenues",
        label: "Ventas",
        matchPrefixes: ["/dashboard/revenues"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        ),
      },
      {
        href: "/dashboard/expenses",
        label: "Gastos",
        matchPrefixes: ["/dashboard/expenses"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Operaciones",
    items: [
      {
        href: "/dashboard/operations",
        label: "Operaciones",
        matchPrefixes: ["/dashboard/operations"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="16" x2="13" y2="16" />
          </svg>
        ),
      },
      {
        href: "/dashboard/projects",
        label: "Proyectos",
        matchPrefixes: ["/dashboard/projects"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/tasks",
        label: "Tareas",
        matchPrefixes: ["/dashboard/tasks"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        ),
      },
      {
        href: "/dashboard/calendar",
        label: "Agenda",
        matchPrefixes: ["/dashboard/calendar"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2.5" x2="16" y2="6.5" />
            <line x1="8" y1="2.5" x2="8" y2="6.5" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
      {
        href: "/dashboard/purchases",
        label: "Compras",
        matchPrefixes: ["/dashboard/purchases"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 7H4l1.5-3H18.5L20 7z" />
            <path d="M4 7v14h16V7" />
            <line x1="9" y1="11" x2="15" y2="11" />
          </svg>
        ),
      },
      {
        href: "/dashboard/inventory",
        label: "Inventario",
        matchPrefixes: ["/dashboard/inventory"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Análisis",
    items: [
      {
        href: "/dashboard/informe",
        label: "Informe",
        matchPrefixes: ["/dashboard/informe"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="14" y2="17" />
          </svg>
        ),
      },
      {
        href: "/dashboard/onboarding",
        label: "Onboarding empresa",
        matchPrefixes: ["/dashboard/onboarding"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 3l1.8 3.6L18 8.4l-3 2.9.7 4.1L12 13.8 8.3 15.4l.7-4.1-3-2.9 4.2-1.8L12 3z" />
          </svg>
        ),
      },
      {
        href: "/dashboard/metrics",
        label: "Métricas",
        matchPrefixes: ["/dashboard/metrics"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
      {
        href: "/dashboard/alerts",
        label: "Alertas",
        matchPrefixes: ["/dashboard/alerts"],
        alertsBadge: true,
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      },
      {
        href: "/dashboard/simulacion",
        label: "Simulación",
        matchPrefixes: ["/dashboard/simulacion"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="12" y1="21" x2="12" y2="12" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Cuenta",
    items: [
      {
        href: "/dashboard/settings",
        label: "Ajustes",
        matchPrefixes: ["/dashboard/settings"],
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ),
      },
    ],
  },
];

function isActive(
  activeHref: string | undefined,
  item: { href: string; matchPrefixes: string[]; exact?: boolean }
) {
  if (!activeHref) return false;
  if (item.exact) return activeHref === item.href || activeHref === `${item.href}/`;
  return item.matchPrefixes.some(
    (p) => activeHref === p || activeHref.startsWith(`${p}/`)
  );
}

export function Sidebar({
  activeHref,
  openAlertsCount = 0,
  showOnboardingNav = true,
}: {
  activeHref?: string;
  openAlertsCount?: number;
  /** false = ya no mostrar "Onboarding empresa" (perfil ya creado). */
  showOnboardingNav?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  const sections = showOnboardingNav
    ? navSections
    : navSections.map((block) => ({
        ...block,
        items: block.items.filter((item) => item.href !== "/dashboard/onboarding"),
      }));

  return (
    <aside
      className="flex flex-col bg-white border-r border-black/[0.06] flex-shrink-0 transition-all duration-200 ease-in-out overflow-hidden"
      style={{ width: expanded ? "236px" : "56px" }}
    >
      {/* ── HEADER del sidebar ── */}
      <div className="flex items-center border-b border-black/[0.05] min-h-[60px] px-3">
        {/* Logo — solo visible expandido */}
        {expanded && (
          <div className="flex items-center gap-2.5 flex-1 overflow-hidden mr-2">
            <div className="w-7 h-7 bg-[#F28705] rounded-[8px] flex items-center justify-center flex-shrink-0">
              <img src="/Icono Normal.svg" alt="" className="h-4 w-4 brightness-0 invert" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[12px] font-black text-black leading-none whitespace-nowrap">
                Katalyth One
              </p>
              <p className="text-[10px] text-black/35 font-medium mt-0.5">Business OS</p>
            </div>
          </div>
        )}

        {/* Botón toggle — centrado cuando colapsado */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={[
            "w-6 h-6 rounded-[6px] bg-[#F5F4F2] hover:bg-black/10 flex items-center justify-center flex-shrink-0 transition-colors",
            !expanded && "mx-auto",
          ].join(" ")}
          title={expanded ? "Colapsar sidebar" : "Expandir sidebar"}
        >
          {expanded ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── NAV ── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden space-y-3">
        {sections.map(({ section, items }) => (
          <div key={section}>
            {/* Label sección */}
            {expanded ? (
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30 px-2 mb-1.5 whitespace-nowrap">
                {section}
              </p>
            ) : (
              <div className="h-px bg-black/[0.06] mx-1 mb-2" />
            )}

            <div className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(activeHref, item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={!expanded ? item.label : undefined}
                    className={[
                      "flex items-center rounded-[9px] transition-colors group relative",
                      expanded ? "gap-2.5 px-2 py-2" : "justify-center px-1.5 py-1.5",
                      active
                        ? "bg-[#FFF3E0]"
                        : "hover:bg-black/[0.04]",
                    ].join(" ")}
                  >
                    {/* Indicador lateral activo — visible en ambos estados */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#F28705] rounded-r-full" />
                    )}

                    {/* Icono */}
                    <div className={[
                      "flex items-center justify-center flex-shrink-0 rounded-[7px] transition-colors",
                      expanded ? "w-7 h-7" : "w-8 h-8",
                      active
                        ? "bg-[#F28705] text-white"
                        : "bg-black/[0.04] text-black/50 group-hover:bg-black/[0.07] group-hover:text-black/70",
                    ].join(" ")}>
                      {item.icon}
                    </div>

                    {/* Label — solo expandido */}
                    {expanded && (
                      <span className={[
                        "text-[12px] font-semibold flex-1 whitespace-nowrap transition-colors",
                        active
                          ? "text-black font-bold"
                          : "text-black/55 group-hover:text-black/80",
                      ].join(" ")}>
                        {item.label}
                      </span>
                    )}

                    {/* Badge alertas */}
                    {item.alertsBadge && openAlertsCount > 0 && (
                      <span className={[
                        "bg-[#F28705] text-white font-black rounded-full leading-none",
                        expanded
                          ? "text-[9px] px-1.5 py-0.5"
                          : "absolute top-0.5 right-0.5 text-[7px] px-1 py-0.5",
                      ].join(" ")}>
                        {openAlertsCount > 9 ? "9+" : openAlertsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}