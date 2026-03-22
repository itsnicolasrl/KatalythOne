"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/src/ui/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/ui/components/Card";

type PlanCode = "FREE" | "PRO" | "BUSINESS";

type BillingStatusResponse = {
  planCode: PlanCode;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
};

type ProfileResponse = {
  profile: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    phone: string | null;
    addressLine1: string | null;
    city: string | null;
    country: string | null;
  } | null;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function SettingsModule(props: { userEmail: string; userDisplayName: string }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState<"profile" | "security" | "billing" | "preferences">("profile");
  const [billing, setBilling] = React.useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileResponse["profile"]>(null);
  const [profileForm, setProfileForm] = React.useState({
    fullName: "",
    avatarUrl: "",
    phone: "",
    addressLine1: "",
    city: "",
    country: "",
  });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [deletingAccount, setDeletingAccount] = React.useState(false);
  const [deleteForm, setDeleteForm] = React.useState({
    password: "",
    confirmation: "",
  });

  const loadProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/account/profile", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as ProfileResponse | null;
      if (!res.ok || !data?.profile) {
        throw new Error(data?.error ?? "No se pudo cargar el perfil");
      }
      setProfile(data.profile);
      setProfileForm({
        fullName: data.profile.fullName ?? "",
        avatarUrl: data.profile.avatarUrl ?? "",
        phone: data.profile.phone ?? "",
        addressLine1: data.profile.addressLine1 ?? "",
        city: data.profile.city ?? "",
        country: data.profile.country ?? "",
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
    }
  }, []);

  const loadBilling = React.useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/status", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as BillingStatusResponse | { error?: string } | null;
      if (!res.ok || !data || "error" in data) {
        throw new Error((data as { error?: string } | null)?.error ?? "No se pudo cargar estado de plan");
      }
      setBilling(data as BillingStatusResponse);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === "billing") {
      void loadBilling();
    }
  }, [tab, loadBilling]);

  React.useEffect(() => {
    if (tab === "profile" || tab === "security") {
      void loadProfile();
    }
  }, [tab, loadProfile]);

  React.useEffect(() => {
    if (searchParams.get("billing") === "simulated") {
      setMessage("Modo simulado de facturación activo.");
      setTab("billing");
    }
  }, [searchParams]);

  async function changePlan(plan: PlanCode) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; redirectUrl?: string | null; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo cambiar el plan");
      }
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setMessage("Plan actualizado correctamente.");
      await loadBilling();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "No se pudo abrir el portal de facturación");
      }
      window.location.href = data.url;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(profileForm),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo guardar el perfil");
      }
      setMessage("Perfil actualizado correctamente.");
      await loadProfile();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("La confirmación de nueva contraseña no coincide.");
      return;
    }
    setSavingPassword(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo cambiar la contraseña");
      }
      setMessage("Contraseña actualizada correctamente.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSavingPassword(false);
    }
  }

  async function deleteAccount() {
    if (deleteForm.confirmation.trim().toUpperCase() !== "ELIMINAR") {
      setMessage("Para eliminar la cuenta debes escribir exactamente ELIMINAR.");
      return;
    }
    setDeletingAccount(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(deleteForm),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo eliminar la cuenta");
      }

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => null);

      window.location.href = "/login?account=scheduled";
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "profile", label: "Perfil" },
          { id: "security", label: "Seguridad" },
          { id: "billing", label: "Plan y facturación" },
          { id: "preferences", label: "Preferencias" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as "profile" | "security" | "billing" | "preferences")}
            className={[
              "rounded-xl px-3 py-2 text-sm font-semibold border",
              tab === t.id
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-surface border-border text-foreground/70 hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          {message}
        </div>
      ) : null}

      {tab === "profile" ? (
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Nombre completo</p>
                <input
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Correo</p>
                <p className="font-bold">{profile?.email ?? props.userEmail}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Avatar URL</p>
                <input
                  value={profileForm.avatarUrl}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Teléfono</p>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3 md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Dirección</p>
                <input
                  value={profileForm.addressLine1}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Ciudad</p>
                <input
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">País</p>
                <input
                  value={profileForm.country}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2"
                />
              </div>
            </div>
            <Button variant="primary" onClick={() => void saveProfile()} disabled={savingProfile}>
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "security" ? (
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Contraseña actual</p>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              />
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Nueva contraseña</p>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              />
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-1">Confirmar nueva contraseña</p>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2"
              />
            </div>
            <Button variant="primary" onClick={() => void changePassword()} disabled={savingPassword}>
              {savingPassword ? "Actualizando..." : "Cambiar contraseña"}
            </Button>

            <div className="mt-4 rounded-xl border border-red-600/30 bg-red-600/10 p-3 space-y-2">
              <p className="text-sm font-extrabold text-red-700">Zona de peligro</p>
              <p className="text-xs text-red-700/90">
                Al eliminar cuenta se activa un plazo de recuperación de 30 días. Durante ese tiempo podrás restaurarla.
              </p>
              <div className="space-y-2">
                <input
                  type="password"
                  value={deleteForm.password}
                  onChange={(e) => setDeleteForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Contraseña actual"
                  className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  value={deleteForm.confirmation}
                  onChange={(e) => setDeleteForm((prev) => ({ ...prev, confirmation: e.target.value }))}
                  placeholder='Escribe "ELIMINAR" para confirmar'
                  className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <Button
                variant="outline"
                className="border-red-400 text-red-700 hover:bg-red-50"
                disabled={deletingAccount}
                onClick={() => void deleteAccount()}
              >
                {deletingAccount ? "Eliminando..." : "Eliminar cuenta"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "billing" ? (
        <Card>
          <CardHeader>
            <CardTitle>Plan y facturación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {loading && !billing ? <p className="text-muted-foreground">Cargando estado de facturación...</p> : null}
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Plan activo</p>
              <p className="font-bold">{billing?.planCode ?? "FREE"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => void changePlan("FREE")} disabled={loading}>
                Cambiar a Free
              </Button>
              <Button variant="secondary" onClick={() => void changePlan("PRO")} disabled={loading}>
                Cambiar a Pro
              </Button>
              <Button variant="primary" onClick={() => void changePlan("BUSINESS")} disabled={loading}>
                Cambiar a Business
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Estado de pago</p>
              <p className="font-bold">{billing?.stripeStatus ?? "Tarjeta interna activa"}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Fin de periodo</p>
                <p className="font-bold">{formatDate(billing?.currentPeriodEnd ?? null)}</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Cancelado en</p>
                <p className="font-bold">{formatDate(billing?.canceledAt ?? null)}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => void openBillingPortal()} disabled={loading}>
              Gestionar tarjeta
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === "preferences" ? (
        <Card>
          <CardHeader>
            <CardTitle>Preferencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
              <p className="font-bold">Notificaciones</p>
              <p className="text-muted-foreground mt-1">Próximamente: alertas por correo, frecuencia de reportes y recordatorios operativos.</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-muted/40 p-3">
              <p className="font-bold">Idioma y región</p>
              <p className="text-muted-foreground mt-1">Próximamente: personalización de formato de moneda, fecha y zona horaria.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
