"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { Textarea } from "@/src/ui/components/Textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/ui/components/Table";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export function ProjectsModule() {
  const [items, setItems] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<Project["status"]>("ACTIVE");

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar proyectos");
      setItems(data?.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          description: description.trim() ? description : null,
          status,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo crear el proyecto");
      setName("");
      setDescription("");
      setStatus("ACTIVE");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold">Proyectos</h2>
        <p className="mt-1 text-sm text-foreground/70">Organiza tareas por proyecto para visualizar el workflow.</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea
              label="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="w-full">
              <label className="block text-sm font-semibold mb-2 text-foreground/90">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Project["status"])}
                className="w-full rounded-xl border border-foreground/15 bg-background text-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            {error ? (
              <p className="text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear proyecto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-foreground/70">Aún no hay proyectos. Crea el primero.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead>Workflow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold">{p.name}</TableCell>
                    <TableCell>{p.status}</TableCell>
                    <TableCell>{new Date(p.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/projects/${p.id}`}>
                          <Button variant="outline">Workflow</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

