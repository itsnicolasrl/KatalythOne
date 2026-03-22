import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { HttpError } from "@/src/lib/errors/HttpError";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError("No autorizado", 401, "UNAUTHORIZED");
  if (user.accountDeletionScheduledFor && user.accountDeletionScheduledFor.getTime() > Date.now()) {
    throw new HttpError(
      "Tu cuenta está pendiente de eliminación. Recupérala desde login.",
      403,
      "ACCOUNT_PENDING_DELETION",
    );
  }
  return user;
}

