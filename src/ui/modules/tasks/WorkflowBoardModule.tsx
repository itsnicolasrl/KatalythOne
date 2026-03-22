"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/src/ui/components/Card";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { Textarea } from "@/src/ui/components/Textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/ui/components/Table";

type Project = {
  id: string;
  name: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueAt: string | null;
  completedAt: string | null;
  projectId: string | null;
};

type TaskEvent = {
  id: string;
  type: "CREATED" | "STATUS_CHANGED" | "COMMENT";
  statusFrom: string | null;
  statusTo: string | null;
  message: string | null;
  actorUserId: string | null;
  createdAt: string;
};

type ProjectsApi = { projects?: Array<Project> };
type TasksApi = { tasks?: Task[] };
type EventsApi = { events?: TaskEvent[] };

const columns: Array<Task["status"]> = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"];

function priorityLabel(p: Task["priority"]) {
  if (p === "URGENT") return "URGENT";
  if (p === "HIGH") return "HIGH";
  if (p === "MEDIUM") return "MEDIUM";
  return "LOW";
}

export function WorkflowBoardModule({ fixedProjectId }: { fixedProjectId?: string }) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(fixedProjectId ?? "");

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<TaskEvent[]>([]);

  const [comment, setComment] = React.useState("");

  // Create task
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<Task["priority"]>("MEDIUM");
  const [dueAt, setDueAt] = React.useState<string>("");
  const [createStatus, setCreateStatus] = React.useState<Task["status"]>("TODO");

  

  React.useEffect(() => {
    if (fixedProjectId) return;
    setSelectedProjectId("");
  }, [fixedProjectId]);

  async function loadProjects() {
    const res = await fetch("/api/projects", { credentials: "include" });
    const json = (await res.json().catch(() => null)) as (ProjectsApi & { error?: string }) | null;
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar proyectos");
    setProjects(json?.projects ?? []);
  }

  async function loadTasks(projectId?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = projectId ? `/api/tasks?projectId=${encodeURIComponent(projectId)}` : "/api/tasks";
      const res = await fetch(url, { credentials: "include" });
      const json = (await res.json().catch(() => null)) as (TasksApi & { error?: string }) | null;
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar tareas");
      setTasks(json?.tasks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}/events?take=50`, { credentials: "include" });
    const json = (await res.json().catch(() => null)) as (EventsApi & { error?: string }) | null;
    if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar eventos");
    setEvents(json?.events ?? []);
  }

  React.useEffect(() => {
    void (async () => {
      await loadProjects();
    })().catch((e) => {
      setError(e instanceof Error ? e.message : "Error de red");
    });
  }, []);

  React.useEffect(() => {
    const effectiveProjectId = fixedProjectId ?? (selectedProjectId || undefined);
    void loadTasks(effectiveProjectId);
    setSelectedTaskId(null);
    setEvents([]);
    setComment("");
  }, [selectedProjectId, fixedProjectId]);

  const tasksByStatus = React.useMemo(() => {
    const map: Record<Task["status"], Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
      CANCELLED: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  async function updateTaskStatus(taskId: string, nextStatus: Task["status"]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo actualizar el estado");
      await loadTasks(fixedProjectId ?? (selectedProjectId || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function submitComment() {
    if (!selectedTaskId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar el comentario");
      setComment("");
      await loadEvents(selectedTaskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function createTask() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        projectId: fixedProjectId ? fixedProjectId : selectedProjectId || null,
        title,
        description: description.trim() ? description : null,
        status: createStatus,
        priority,
        dueAt: dueAt ? dueAt : null,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo crear la tarea");

      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setDueAt("");
      setCreateStatus("TODO");

      await loadTasks(fixedProjectId ?? (selectedProjectId || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm font-semibold text-red-700 bg-red-600/10 border border-red-600/30 px-3 py-2 rounded-xl">
          {error}
        </p>
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">Workflow de tareas</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Visualiza el flujo de trabajo y el seguimiento en DB.
          </p>
        </div>

        {fixedProjectId ? (
          <div className="text-sm text-foreground/70">
            Proyecto fijo: <span className="font-extrabold text-foreground/90">{fixedProjectId}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
          {!fixedProjectId ? (
            <Card>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="w-full">
                    <label className="block text-sm font-semibold mb-2 text-foreground/90">Proyecto (opcional)</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full rounded-xl border border-foreground/15 bg-background text-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Todos</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent>
              <h3 className="text-lg font-extrabold">Crear tarea</h3>
              <p className="mt-1 text-sm text-foreground/70">Guarda la tarea y crea tracking de eventos.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void createTask();
                }}
                className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
              >
                <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />

                <div className="w-full">
                  <label className="block text-sm font-semibold mb-2 text-foreground/90">Estado inicial</label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value as Task["status"])}
                    className="w-full rounded-xl border border-foreground/15 bg-background text-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-semibold mb-2 text-foreground/90">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task["priority"])}
                    className="w-full rounded-xl border border-foreground/15 bg-background text-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <Input label="Vence (opcional)" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />

                <div className="md:col-span-4">
                  <Textarea label="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="md:col-span-4 flex justify-end gap-3">
                  <Button type="submit" disabled={loading || !title.trim()}>
                    {loading ? "Creando..." : "Crear tarea"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {columns.map((statusKey) => (
              <Card key={statusKey}>
                <CardContent>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-sm font-extrabold uppercase tracking-wide">{statusKey}</h4>
                    <span className="text-xs text-foreground/60">{tasksByStatus[statusKey].length}</span>
                  </div>

                  <div className="space-y-3">
                    {tasksByStatus[statusKey].length === 0 ? (
                      <p className="text-sm text-foreground/70">Sin tareas</p>
                    ) : null}

                    {tasksByStatus[statusKey].map((t) => (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-foreground/10 bg-background p-3 cursor-pointer hover:bg-foreground/[0.03]"
                        onClick={() => {
                          setSelectedTaskId(t.id);
                          void loadEvents(t.id);
                        }}
                      >
                        <div className="font-extrabold text-sm">{t.title}</div>
                        <div className="mt-1 text-xs text-foreground/60">
                          Prioridad: {priorityLabel(t.priority)}
                        </div>
                        {t.dueAt ? (
                          <div className="mt-1 text-xs text-foreground/60">
                            Vence: {new Date(t.dueAt).toLocaleDateString()}
                          </div>
                        ) : null}

                        <div className="mt-3">
                          <label className="block text-xs font-semibold mb-1 text-foreground/70">Mover</label>
                          <select
                            value={t.status}
                            onChange={(e) => updateTaskStatus(t.id, e.target.value as Task["status"])}
                            className="w-full rounded-xl border border-foreground/15 bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                          >
                            {columns.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <Card>
            <CardContent>
              <h3 className="text-lg font-extrabold">Seguimiento</h3>
              <p className="mt-1 text-sm text-foreground/70">
                Eventos de la tarea seleccionada.
              </p>

              {selectedTaskId ? (
                <div className="mt-4 space-y-4">
                  <div className="text-sm text-foreground/70">
                    Task ID: <span className="font-extrabold text-foreground/90">{selectedTaskId}</span>
                  </div>

                  <Textarea
                    label="Añadir comentario (opcional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ej: Ajustamos el plan y revisamos el bloqueo..."
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      disabled={loading || comment.trim().length === 0}
                      onClick={(e) => {
                        e.preventDefault();
                        void submitComment();
                      }}
                      type="button"
                    >
                      Guardar comentario
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-foreground/70">Selecciona una tarea para ver su seguimiento.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              {selectedTaskId ? (
                events.length === 0 ? (
                  <p className="text-sm text-foreground/70">Aún no hay eventos.</p>
                ) : (
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.slice(0, 30).map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell>{new Date(ev.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{ev.type}</TableCell>
                          <TableCell>
                            {ev.type === "STATUS_CHANGED" ? (
                              <span>
                                {ev.statusFrom ?? "—"} &rarr; {ev.statusTo ?? "—"}
                              </span>
                            ) : ev.message ? (
                              ev.message
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              ) : (
                <p className="text-sm text-foreground/70">El seguimiento se mostrará aquí.</p>
              )}
            </CardContent>
          </Card>

          {/* Nota: se usa Link solo si quieres saltar a detalles más adelante */}
          <div className="text-xs text-foreground/60">
            <Link href="/dashboard/tasks">Workflow completo</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

