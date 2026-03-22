"use client";

import * as React from "react";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/ui/components/Table";

type PermissionRow = {
  id: string;
  key: string;
  description: string | null;
  createdAt: string;
};

type RolePermissionRow = {
  allowed: boolean;
  permission: { key: string; description: string | null };
};

const roleOptions = ["OWNER", "ADMIN", "MEMBER"] as const;

export function RolePermissionsModule() {
  const [role, setRole] = React.useState<(typeof roleOptions)[number]>("ADMIN");

  const [permissions, setPermissions] = React.useState<PermissionRow[]>([]);
  const [rolePermissionByKey, setRolePermissionByKey] = React.useState<Record<string, boolean>>({});

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [newPermissionKey, setNewPermissionKey] = React.useState("");
  const [newPermissionDescription, setNewPermissionDescription] = React.useState("");

  async function loadAll() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/permissions", { credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudieron cargar permisos");
      setPermissions((json as { permissions: PermissionRow[] }).permissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function loadRolePermissions(nextRole: (typeof roleOptions)[number]) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/role-permissions?role=${encodeURIComponent(nextRole)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudieron cargar permisos por rol");

      const rows = (json as { rows: RolePermissionRow[] }).rows ?? [];
      const map: Record<string, boolean> = {};
      for (const row of rows) map[row.permission.key] = row.allowed;
      setRolePermissionByKey(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadAll();
  }, []);

  React.useEffect(() => {
    void loadRolePermissions(role);
  }, [role]);

  async function onTogglePermission(permissionKey: string, allowed: boolean) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/role-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role, permissionKey, allowed }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudo actualizar el permiso");
      setRolePermissionByKey((prev) => ({ ...prev, [permissionKey]: allowed }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onCreatePermission(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const key = newPermissionKey.trim();
      if (key.length < 3) throw new Error("key de permiso muy corto");

      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, description: newPermissionDescription.trim() ? newPermissionDescription : undefined }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string } | null)?.error ?? "No se pudo crear el permiso");

      setNewPermissionKey("");
      setNewPermissionDescription("");
      await loadAll();
      await loadRolePermissions(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold">Roles y permisos</h3>
            <p className="mt-1 text-sm text-foreground/70">Configura qué rol puede ejecutar cada permiso.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground/90">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof roleOptions)[number])}
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
        </div>

        <div className="mt-5">
          {error ? (
            <p className="text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 border-t border-foreground/10 pt-5">
          <form onSubmit={onCreatePermission} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Input label="Nuevo permiso (key)" value={newPermissionKey} onChange={(e) => setNewPermissionKey(e.target.value)} />
            <Input
              label="Descripción (opcional)"
              value={newPermissionDescription}
              onChange={(e) => setNewPermissionDescription(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                Crear permiso
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permiso</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Allowed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.length === 0 ? (
                <TableRow>
                  <TableCell className="text-sm text-foreground/70">No hay permisos en la base de datos.</TableCell>
                  <TableCell className="text-sm text-foreground/70">—</TableCell>
                  <TableCell className="text-sm text-foreground/70">—</TableCell>
                </TableRow>
              ) : (
                permissions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.key}</TableCell>
                    <TableCell>{p.description ?? "—"}</TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={Boolean(rolePermissionByKey[p.key])}
                        onChange={(e) => void onTogglePermission(p.key, e.target.checked)}
                        disabled={loading}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

