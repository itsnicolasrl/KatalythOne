import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/server/auth/getCurrentUser";
import { SettingsModule } from "@/src/ui/modules/settings/SettingsModule";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userDisplayName = user.fullName?.trim() || user.email.split("@")[0] || "Usuario";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-xl font-extrabold">Ajustes de cuenta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona tu perfil, facturación y plan desde un solo lugar.
        </p>
      </div>
      <SettingsModule userEmail={user.email} userDisplayName={userDisplayName} />
    </div>
  );
}
