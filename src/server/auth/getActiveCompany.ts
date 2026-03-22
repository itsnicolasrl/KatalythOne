import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { getActiveCompanyForUser } from "@/src/services/companies/companyService";
import { getActiveCompanyIdFromCookies } from "@/src/lib/company/activeCompanyCookie";

export async function getActiveCompanyForRequest() {
  const user = await getCurrentUser();
  if (!user) return null;
  const activeCompanyId = await getActiveCompanyIdFromCookies();
  return getActiveCompanyForUser(user.id, activeCompanyId);
}

