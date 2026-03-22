import { redirect } from "next/navigation";
import { acceptCompanyInvite } from "@/src/services/invites/companyInvitesService";
import { requireUser } from "@/src/api/auth/requireUser";
import { HttpError } from "@/src/lib/errors/HttpError";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = searchParams?.token;
  if (!token) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <h2 className="text-xl font-extrabold">Invitación inválida</h2>
        <p className="text-sm text-foreground/70">No se recibió un token de invitación.</p>
        <a className="underline underline-offset-4 text-sm" href="/dashboard/companies">
          Volver
        </a>
      </div>
    );
  }

  let role: string | null = null;
  let errorMessage: string | null = null;
  let needsLogin = false;

  try {
    const user = await requireUser();
    const result = await acceptCompanyInvite({
      rawToken: token,
      userId: user.id,
      userEmail: user.email,
    });
    role = result.role;
  } catch (err) {
    if (err instanceof HttpError && err.statusCode === 401) {
      needsLogin = true;
    } else {
      errorMessage = err instanceof Error ? err.message : "No se pudo aceptar la invitación";
    }
  }

  if (needsLogin) {
    const nextUrl = `/invites/accept?token=${encodeURIComponent(token)}`;
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }

  if (!role) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <h2 className="text-xl font-extrabold">No se pudo aceptar</h2>
        <p className="text-sm text-foreground/70">{errorMessage ?? "No se pudo aceptar la invitación"}</p>
        <a className="underline underline-offset-4 text-sm" href="/login">
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-extrabold">Invitación aceptada</h2>
      <p className="text-sm text-foreground/70">
        Ya tienes acceso a la empresa con rol <span className="font-semibold">{role}</span>.
      </p>
      <a className="underline underline-offset-4 text-sm" href="/dashboard">
        Ir al dashboard
      </a>
    </div>
  );
}

