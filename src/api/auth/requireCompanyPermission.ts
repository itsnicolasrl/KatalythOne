import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { HttpError } from "@/src/lib/errors/HttpError";
import { checkCompanyPermission } from "@/src/services/permissions/permissionsService";

export async function requireCompanyPermission(params: {
  companyId: string;
  permissionKey: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new HttpError("No autorizado", 401, "UNAUTHORIZED");

  const ok = await checkCompanyPermission({
    userId: user.id,
    companyId: params.companyId,
    permissionKey: params.permissionKey,
  });

  if (!ok) throw new HttpError("Prohibido", 403, "FORBIDDEN");
}

