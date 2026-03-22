"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/ui/components/Table";

const roleOptions = ["OWNER", "ADMIN", "MEMBER"] as const;
type Role = (typeof roleOptions)[number];

type MembershipRow = {
  userId: string;
  role: Role;
  createdAt: string;
  user: { id: string; email: string; createdAt: string } | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  acceptedByUserId: string | null;
};

export function MembershipsModule({ companyId }: { companyId: string }) {
  const [memberships, setMemberships] = React.useState<MembershipRow[]>([]);
  const [invites, setInvites] = React.useState<InviteRow[]>([]);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<Role>("MEMBER");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [lastCreatedInviteLink, setLastCreatedInviteLink] = React.useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        fetch(`/api/companies/${encodeURIComponent(companyId)}/memberships`, { credentials: "include" }),
        fetch(`/api/companies/${encodeURIComponent(companyId)}/invites`, { credentials: "include" }),
      ]);

      const mJson = await mRes.json().catch(() => null);
      if (!mRes.ok) throw new Error((mJson as { error?: string } | null)?.error ?? "No se pudieron cargar miembros");

      const iJson = await iRes.json().catch(() => null);
      if (!iRes.ok) throw new Error((iJson as { error?: string } | null)?.error ?? "No se pudieron cargar invitaciones");

      setMemberships(((mJson as { memberships: MembershipRow[] })?.memberships ?? []) as MembershipRow[]);
      setInvites((iJson as { invites: InviteRow[] })?.invites ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function onChangeRole(userId: string, nextRole: Role) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/memberships/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: nextRole }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudo actualizar el rol");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onRemoveMember(userId: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/memberships/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudo eliminar el miembro");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLastCreatedInviteLink(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudo crear la invitación");

      const data = json as { inviteUrl?: string };
      if (data.inviteUrl) setLastCreatedInviteLink(data.inviteUrl);

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onRevokeInvite(inviteId: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${encodeURIComponent(companyId)}/invites/${encodeURIComponent(inviteId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudo revocar la invitación");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-extrabold">Miembros</h3>
              <p className="mt-1 text-sm text-foreground/70">Gestiona roles y acceso de usuarios reales.</p>
            </div>
            <div className="text-sm text-foreground/70">
              <Link href="/dashboard/companies" className="underline underline-offset-4">
                Volver a empresas
              </Link>
            </div>
          </div>

          {error ? (
            <p className="mt-4 text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          ) : null}

          <div className="mt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-sm text-foreground/70">No hay miembros en esta empresa.</TableCell>
                    <TableCell className="text-sm text-foreground/70">—</TableCell>
                    <TableCell className="text-sm text-foreground/70">—</TableCell>
                  </TableRow>
                ) : (
                  memberships.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell className="font-semibold">{m.user?.email ?? m.userId}</TableCell>
                      <TableCell>
                        <select
                          value={m.role}
                          onChange={(e) => void onChangeRole(m.userId, e.target.value as Role)}
                          className="rounded-xl border border-foreground/15 bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          disabled={loading}
                        >
                          {roleOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={() => void onRemoveMember(m.userId)} disabled={loading}>
                            Eliminar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-lg font-extrabold">Invitar usuarios</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Crea una invitación segura por token. El invitado aceptará con su cuenta (login/register).
          </p>

          <form onSubmit={onCreateInvite} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input label="Email del invitado" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <div className="w-full">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Rol</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="w-full rounded-xl border border-foreground/15 bg-background text-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={loading}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading || !inviteEmail.trim()}>
                {loading ? "Creando..." : "Crear invitación"}
              </Button>
            </div>
          </form>

          {lastCreatedInviteLink ? (
            <div className="mt-4 rounded-2xl border border-foreground/10 bg-background px-3 py-3">
              <p className="text-sm font-extrabold">Invitación lista</p>
              <p className="mt-1 text-sm text-foreground/70">Envíala por email o chat al usuario:</p>
              <input
                className="mt-2 w-full rounded-xl border border-foreground/15 bg-background px-4 py-2"
                value={lastCreatedInviteLink}
                readOnly
              />
            </div>
          ) : null}

          <div className="mt-6">
            <h4 className="text-sm font-extrabold">Invitaciones recientes</h4>
            <div className="mt-3">
              {invites.length === 0 ? (
                <p className="text-sm text-foreground/70">No hay invitaciones.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.slice(0, 10).map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-semibold">{inv.email}</TableCell>
                        <TableCell>{inv.role}</TableCell>
                        <TableCell>
                          {inv.acceptedAt
                            ? "Aceptada"
                            : inv.revokedAt
                              ? "Revocada"
                              : inv.expiresAt
                                ? `Vence: ${new Date(inv.expiresAt).toLocaleDateString()}`
                                : "Pendiente"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {!inv.acceptedAt && !inv.revokedAt ? (
                              <Button variant="ghost" onClick={() => void onRevokeInvite(inv.id)} disabled={loading}>
                                Revocar
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

