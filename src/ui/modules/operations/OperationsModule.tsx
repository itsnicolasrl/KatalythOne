"use client";

import * as React from "react";

type Operation = {
  id: string;
  name: string;
  status: "PLANNED" | "RUNNING" | "COMPLETED" | "PAUSED" | "CANCELLED";
  scheduledFor: string | null;
  completedAt: string | null;
  description: string | null;
  createdAt: string;
};

// ── helpers ──────────────────────────────────────────────
function dateToInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function statusStyles(status: Operation["status"]) {
  switch (status) {
    case "RUNNING":   return { badge: "bg-blue-50 text-blue-600",    dot: "bg-blue-500",    label: "En curso" };
    case "COMPLETED": return { badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500", label: "Completada" };
    case "PAUSED":    return { badge: "bg-amber-50 text-amber-600",   dot: "bg-amber-500",   label: "Pausada" };
    case "CANCELLED": return { badge: "bg-red-50 text-red-500",       dot: "bg-red-400",     label: "Cancelada" };
    default:          return { badge: "bg-[#F5F4F2] text-black/50",   dot: "bg-black/20",    label: "Planeada" };
  }
}

const STATUS_OPTIONS: Array<{ value: Operation["status"]; label: string }> = [
  { value: "PLANNED",   label: "Planeada" },
  { value: "RUNNING",   label: "En curso" },
  { value: "COMPLETED", label: "Completada" },
  { value: "PAUSED",    label: "Pausada" },
  { value: "CANCELLED", label: "Cancelada" },
];

export function OperationsModule() {
  const [items, setItems] = React.useState<Operation[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState<Operation["status"]>("PLANNED");
  const [scheduledFor, setScheduledFor] = React.useState("");
  const [completedAt, setCompletedAt] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    setScheduledFor(dateToInputValue(new Date()));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operations", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudieron cargar operaciones");
      setItems(data.operations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setStatus("PLANNED");
    setDescription("");
    setScheduledFor(dateToInputValue(new Date()));
    setCompletedAt("");
    setShowForm(false);
  }

  function startEdit(op: Operation) {
    setEditingId(op.id);
    setName(op.name);
    setStatus(op.status);
    setScheduledFor(op.scheduledFor ? op.scheduledFor.slice(0, 10) : "");
    setCompletedAt(op.completedAt ? op.completedAt.slice(0, 10) : "");
    setDescription(op.description ?? "");
    setShowForm(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        status,
        scheduledFor: scheduledFor.trim() || null,
        completedAt: completedAt.trim() || null,
        description: description.trim() || null,
      };
      const res = editingId
        ? await fetch(`/api/operations/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          })
        : await fetch("/api/operations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo guardar");
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/operations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusyId(null);
    }
  }

  // Estadísticas rápidas
  const stats = {
    total: items.length,
    running: items.filter(i => i.status === "RUNNING").length,
    completed: items.filter(i => i.status === "COMPLETED").length,
    planned: items.filter(i => i.status === "PLANNED").length,
  };

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-[#0A0A0A] rounded-2xl px-6 py-5 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(242,135,5,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.07) 1px,transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        <div
          className="absolute right-0 top-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right,rgba(242,135,5,0.2) 0%,transparent 70%)" }}
        />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Gestión operativa
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Operaciones</h2>
            <p className="text-xs text-white/40 mt-1">
              {stats.total} operación{stats.total !== 1 ? "es" : ""} · {stats.running} en curso · {stats.planned} planeadas
            </p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva operación
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Stats pills */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-black", bg: "bg-[#F5F4F2]" },
            { label: "En curso", value: stats.running, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Completadas", value: stats.completed, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Planeadas", value: stats.planned, color: "text-[#F28705]", bg: "bg-[#FFF3E0]" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-lg font-black ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-xs font-bold text-black/50">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── FORMULARIO ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-black">
                {editingId ? "Editar operación" : "Nueva operación"}
              </p>
              <p className="text-[10px] text-black/40 mt-0.5">
                {editingId ? "Modifica los campos y guarda los cambios" : "Completa los campos para registrar una operación"}
              </p>
            </div>
            <button
              onClick={resetForm}
              className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
              {/* Nombre */}
              <div className="md:col-span-2 xl:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Cierre de ventas Q1"
                  required
                  className="w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2">
                  Estado
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Operation["status"])}
                  className="w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Programada */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2">
                  Programada para
                </label>
                <input
                  type="date"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all"
                />
              </div>

              {/* Completada */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2">
                  Completada el
                </label>
                <input
                  type="date"
                  value={completedAt}
                  onChange={(e) => setCompletedAt(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all"
                />
              </div>

              {/* Descripción */}
              <div className="md:col-span-2 xl:col-span-1">
                <label className="block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contexto adicional..."
                  className="w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-4 py-2.5 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                      <path d="M21 12a9 9 0 00-9-9"/>
                    </svg>
                    Guardando...
                  </>
                ) : editingId ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Actualizar
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Crear operación
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LISTA ── */}
      {items.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-16 text-center">
          <div className="w-14 h-14 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <p className="text-sm font-black text-black mb-1">Sin operaciones aún</p>
          <p className="text-xs text-black/40 mb-6 max-w-xs mx-auto">
            Registra tareas y actividades operativas para hacer seguimiento de su estado.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-6 py-2.5 rounded-full"
          >
            Crear primera operación
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {/* Header tabla */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
            {[
              { label: "Operación", col: "col-span-4" },
              { label: "Estado", col: "col-span-2" },
              { label: "Programada", col: "col-span-2" },
              { label: "Completada", col: "col-span-2" },
              { label: "", col: "col-span-2 text-right" },
            ].map(({ label, col }) => (
              <div key={label} className={col}>
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
              </div>
            ))}
          </div>

          {/* Filas */}
          {items.map((op) => {
            const st = statusStyles(op.status);
            const isBusy = busyId === op.id;
            return (
              <div
                key={op.id}
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors"
              >
                {/* Nombre */}
                <div className="col-span-4">
                  <p className="text-sm font-black text-black truncate">{op.name}</p>
                  {op.description && (
                    <p className="text-[10px] text-black/40 mt-0.5 truncate">{op.description}</p>
                  )}
                </div>

                {/* Estado */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg ${st.badge}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>

                {/* Programada */}
                <div className="col-span-2">
                  <p className="text-xs text-black/50 font-medium">
                    {op.scheduledFor ? formatDate(op.scheduledFor) : "—"}
                  </p>
                </div>

                {/* Completada */}
                <div className="col-span-2">
                  <p className="text-xs text-black/50 font-medium">
                    {op.completedAt ? formatDate(op.completedAt) : "—"}
                  </p>
                </div>

                {/* Acciones */}
                <div className="col-span-2 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => startEdit(op)}
                    className="flex items-center gap-1 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-2.5 py-1.5 rounded-lg"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => void onDelete(op.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-lg"
                  >
                    {isBusy ? (
                      <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                        <path d="M21 12a9 9 0 00-9-9"/>
                      </svg>
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                      </svg>
                    )}
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

    </div>
  );
}