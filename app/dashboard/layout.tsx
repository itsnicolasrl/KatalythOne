import { redirect } from "next/navigation";
import { DashboardShell } from "@/src/ui/layout/DashboardShell";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { listCompaniesForUser } from "@/src/services/companies/companyService";
import { hasCompletedCompanyOnboarding } from "@/src/services/onboarding/onboardingCompletionService";
import type React from "react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [activeCompany, companies] = await Promise.all([
    getActiveCompanyForRequest(),
    listCompaniesForUser(user.id),
  ]);

  const onboardingDone =
    activeCompany != null ? await hasCompletedCompanyOnboarding(activeCompany.id) : false;
  /** Sin empresa activa → sigue visible (alta / elegir empresa). Con empresa y perfil → se oculta. */
  const showOnboardingNav = !activeCompany || !onboardingDone;

  const companyItems = companies.map((m) => ({
    companyId: m.companyId,
    companyName: m.company.name,
    role: m.role,
  }));
  return (
    <DashboardShell
      companyName={activeCompany?.name ?? null}
      activeCompanyId={activeCompany?.id ?? null}
      companies={companyItems}
      showOnboardingNav={showOnboardingNav}
    >
      {children}
    </DashboardShell>
  );
}

