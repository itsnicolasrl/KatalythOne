import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { getActiveCompanyForRequest } from "@/src/server/auth/getActiveCompany";
import { hasCompletedCompanyOnboarding } from "@/src/services/onboarding/onboardingCompletionService";
import { OnboardingWorkspace } from "@/src/ui/onboarding/OnboardingWorkspace";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const active = await getActiveCompanyForRequest();
  if (active && (await hasCompletedCompanyOnboarding(active.id))) {
    redirect("/dashboard/informe");
  }

  return (
    <div className="w-full flex flex-col flex-1 min-h-[calc(100dvh-5.5rem)]">
      <OnboardingWorkspace />
    </div>
  );
}

