import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { listCompaniesForUser } from "@/src/services/companies/companyService";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { CompanySelectionTable } from "@/src/ui/modules/companies/CompanySelectionTable";

export default async function CompaniesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const memberships = await listCompaniesForUser(user.id);
  const activeCompany = await getActiveCompanyForRequest();
  const activeCompanyId = activeCompany?.id ?? null;

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-[#0A0A0A] rounded-2xl px-6 py-5 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(242,135,5,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.07) 1px,transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute right-0 top-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right, rgba(242,135,5,0.2) 0%, transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Portafolio empresarial
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
              Empresas
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {memberships.length} empresa{memberships.length !== 1 ? "s" : ""} registrada{memberships.length !== 1 ? "s" : ""} · Contexto independiente por empresa
            </p>
          </div>
          <Link href="/dashboard/companies/new">
            <button className="rounded-xl bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nueva empresa
            </button>
          </Link>
        </div>
      </div>

      {/* ── STAT PILLS ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total empresas",
            value: memberships.length,
            color: "text-[#F28705]",
            bg: "bg-[#FFF3E0]",
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            ),
          },
          {
            label: "Empresa activa",
            value: activeCompany?.name ?? "—",
            isText: true,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ),
          },
          {
            label: "Contexto",
            value: "Aislado",
            color: "text-black/60",
            bg: "bg-[#F5F4F2]",
            icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            ),
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-black/40">{s.label}</p>
              <p className={`text-sm font-black truncate ${s.color}`}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── TABLA / LISTA ── */}
      {memberships.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Aún no tienes empresas</p>
          <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">
            Crea tu primera empresa para empezar a registrar datos, métricas y diagnósticos.
          </p>
          <Link href="/dashboard/companies/new">
            <button className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full">
              Crear primera empresa
            </button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-black">Tus empresas</p>
              <p className="text-[10px] text-black/40 mt-0.5">
                Haz clic en una empresa para activarla y operar con sus datos
              </p>
            </div>
            <Link href="/dashboard/companies/new">
              <button className="text-[10px] font-bold text-[#F28705] hover:underline flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Nueva empresa
              </button>
            </Link>
          </div>
          <CompanySelectionTable
            memberships={memberships}
            activeCompanyId={activeCompanyId}
          />
        </div>
      )}

    </div>
  );
}