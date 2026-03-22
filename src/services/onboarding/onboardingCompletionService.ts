import { getPrisma } from "@/src/db/prisma";

/** True si la empresa ya culminó el onboarding (perfil guardado en BD). */
export async function hasCompletedCompanyOnboarding(companyId: string): Promise<boolean> {
  const prisma = getPrisma();
  const row = await prisma.companyOnboardingProfile.findUnique({
    where: { companyId },
    select: { companyId: true },
  });
  return row != null;
}
