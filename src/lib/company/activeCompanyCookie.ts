import { cookies } from "next/headers";

export const ACTIVE_COMPANY_COOKIE_NAME = "katalyth_active_company_id";

export async function getActiveCompanyIdFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_COMPANY_COOKIE_NAME)?.value ?? null;
}

