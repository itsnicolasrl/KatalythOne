"use client";

import * as React from "react";

type ViewMode = "day" | "week" | "agenda";
type CalendarItem = {
  id: string;
  sourceType: "CUSTOM" | "TASK" | "OPERATION";
  sourceId: string;
  title: string;
  startAt: string;
  type: string;
};

// ── helpers ──────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, "0");

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const startOfWeekMonday = (d: Date) => {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
};

const toInputDateTimeLocal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const isToday = (d: Date) => dayKey(d) === dayKey(new Date());

function sourceStyles(type: string) {
  switch (type) {
    case "TASK":      return "bg-blue-50 text-blue-600 border-blue-100";
    case "OPERATION": return "bg-purple-50 text-purple-600 border-purple-100";
    default:          return "bg-[#FFF3E0] text-[#F28705] border-[#F28705]/20";
  }
}

function sourceLabel(type: string) {
  switch (type) {
    case "TASK":      return "Tarea";
    case "OPERATION": return "Operación";
    default:          return "Evento";
  }
}

const inputCls = "w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all";
const labelCls = "block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2";

export function CalendarModule() {
  const [view, setView] = React.useState<ViewMode>("week");
  const [cursorDate, setCursorDate] = React.useState(() => new Date());
  const [items, setItems] = React.useState<CalendarItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createStartAt, setCreateStartAt] = React.useState(toInputDateTimeLocal(new Date()));

  const range = React.useMemo(() => {
    if (view === "day") {
      const start = new Date(cursorDate);
      start.setHours(0, 0, 0, 0);
      return { start, end: addDays(start, 1) };
    }
    if (view === "agenda") {
      const start = new Date(cursorDate);
      start.setHours(0, 0, 0, 0);
      return { start, end: addDays(start, 30) };
    }
    const start = startOfWeekMonday(cursorDate);
    return { start, end: addDays(start, 7) };
  }, [cursorDate, view]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/calendar/events?startAt=${encodeURIComponent(range.start.toISOString())}&endAt=${encodeURIComponent(range.end.toISOString())}`,
        { credentials: "include" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudieron cargar eventos");
      setItems(json?.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [range.start.toISOString(), range.end.toISOString()]);

  const days = React.useMemo(() => {
    if (view === "day") return [range.start];
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(range.start, i));
    return [];
  }, [view, range.start]);

  const itemsByDay = React.useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const k = dayKey(new Date(it.startAt));
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    return map;
  }, [items]);

  async function createEvent() {
    if (!createTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "CUSTOM",
          title: createTitle.trim(),
          startAt: new Date(createStartAt).toISOString(),
          allDay: false,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "No se pudo crear evento");
      setCreateTitle("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  // Navigation labels
  const navLabel = React.useMemo(() => {
    if (view === "day") {
      return range.start.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (view === "week") {
      const end = addDays(range.end, -1);
      const startStr = range.start.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
      const endStr = end.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
      return `${startStr} – ${endStr}`;
    }
    return range.start.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) + " · próximos 30 días";
  }, [view, range]);

  function navigate(dir: 1 | -1) {
    setCursorDate((prev) => {
      const d = new Date(prev);
      if (view === "day") d.setDate(d.getDate() + dir);
      else if (view === "week") d.setDate(d.getDate() + 7 * dir);
      else d.setDate(d.getDate() + 30 * dir);
      return d;
    });
  }

  const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-[#0A0A0A] rounded-2xl px-6 py-5 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(242,135,5,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(242,135,5,0.07) 1px,transparent 1px)`,
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute right-0 top-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle at top right,rgba(242,135,5,0.2) 0%,transparent 70%)" }} />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Agenda y calendario
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">Calendario</h2>
            <p className="text-xs text-white/40 mt-1">
              {items.length} evento{items.length !== 1 ? "s" : ""} en este rango
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex bg-white/10 rounded-xl p-1 gap-1">
              {([["day", "Día"], ["week", "Semana"], ["agenda", "Agenda"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setView(key)}
                  className={["px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                    view === key ? "bg-[#F28705] text-white" : "text-white/50 hover:text-white"].join(" ")}>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nuevo evento
            </button>
          </div>
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

      {/* Formulario nuevo evento */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.05] flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-black">Nuevo evento</p>
              <p className="text-[10px] text-black/40 mt-0.5">Crea un evento personalizado en tu agenda</p>
            </div>
            <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className={labelCls}>Título del evento *</label>
                <input
                  type="text" value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Ej: Reunión con cliente"
                  className={inputCls}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && createTitle.trim()) void createEvent(); }}
                />
              </div>
              <div>
                <label className={labelCls}>Fecha y hora</label>
                <input type="datetime-local" value={createStartAt} onChange={(e) => setCreateStartAt(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="text-xs font-bold text-black/50 hover:text-black bg-[#F5F4F2] px-4 py-2.5 rounded-xl">Cancelar</button>
              <button
                onClick={() => void createEvent()}
                disabled={loading || !createTitle.trim()}
                className="flex items-center gap-1.5 bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors text-white text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                {loading ? (
                  <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                ) : null}
                {loading ? "Creando..." : "Crear evento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVEGACIÓN DE FECHAS ── */}
      <div className="bg-white rounded-2xl border border-black/[0.06] px-5 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {loading && (
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
              <path d="M21 12a9 9 0 00-9-9"/>
            </svg>
          )}
          <p className="text-sm font-black text-black capitalize">{navLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursorDate(new Date())}
            className="text-[10px] font-bold text-[#F28705] hover:text-[#F25C05] bg-[#FFF3E0] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 rounded-lg bg-[#F5F4F2] hover:bg-black/[0.07] flex items-center justify-center transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── VISTA AGENDA ── */}
      {view === "agenda" && (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-[#FFF3E0] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <p className="text-sm font-black text-black mb-1">Sin eventos en este rango</p>
              <p className="text-xs text-black/40">Crea un evento o navega a otro período.</p>
            </div>
          ) : (
            <div>
              <div className="px-5 py-3 border-b border-black/[0.05] grid grid-cols-12 gap-4">
                {[
                  { label: "Fecha y hora", col: "col-span-4" },
                  { label: "Evento", col: "col-span-5" },
                  { label: "Tipo", col: "col-span-3" },
                ].map(({ label, col }) => (
                  <div key={label} className={col}>
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">{label}</p>
                  </div>
                ))}
              </div>
              {items.map((it) => (
                <div key={it.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-black/[0.04] items-center hover:bg-[#F5F4F2] transition-colors">
                  <div className="col-span-4">
                    <p className="text-xs font-bold text-black">
                      {new Date(it.startAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-black/40 mt-0.5">
                      {new Date(it.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="col-span-5">
                    <p className="text-sm font-black text-black truncate">{it.title}</p>
                  </div>
                  <div className="col-span-3">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${sourceStyles(it.sourceType)}`}>
                      {sourceLabel(it.sourceType)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VISTA SEMANA / DÍA ── */}
      {(view === "week" || view === "day") && (
        <div className={[
          "bg-white rounded-2xl border border-black/[0.06] overflow-hidden",
          view === "week" ? "grid grid-cols-7" : "grid grid-cols-1",
        ].join(" ")}>
          {days.map((day, idx) => {
            const k = dayKey(day);
            const list = itemsByDay.get(k) ?? [];
            const today = isToday(day);
            return (
              <div key={k} className={[
                "border-r border-black/[0.05] last:border-r-0",
                view === "week" && idx > 0 ? "" : "",
              ].join(" ")}>
                {/* Day header */}
                <div className={[
                  "px-3 py-3 border-b border-black/[0.05] text-center",
                  today ? "bg-[#FFF3E0]" : "",
                ].join(" ")}>
                  {view === "week" && (
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/30 mb-1">
                      {DAY_LABELS[idx]}
                    </p>
                  )}
                  <p className={[
                    "text-base font-black leading-none",
                    today ? "text-[#F28705]" : "text-black",
                  ].join(" ")}>
                    {day.getDate()}
                  </p>
                  {view === "week" && (
                    <p className="text-[9px] text-black/35 mt-0.5">
                      {day.toLocaleDateString("es-CO", { month: "short" })}
                    </p>
                  )}
                  {view === "day" && (
                    <p className="text-sm text-black/50 mt-0.5">
                      {day.toLocaleDateString("es-CO", { weekday: "long", month: "long" })}
                    </p>
                  )}
                </div>

                {/* Events */}
                <div className={["p-2 space-y-1.5", view === "day" ? "min-h-[200px]" : "min-h-[120px]"].join(" ")}>
                  {list.length === 0 ? (
                    <p className="text-[10px] text-black/20 text-center pt-3">—</p>
                  ) : list.map((it) => (
                    <div
                      key={it.id}
                      className={`rounded-lg border px-2 py-1.5 ${sourceStyles(it.sourceType)}`}
                    >
                      <p className="text-[10px] font-black leading-tight truncate">{it.title}</p>
                      <p className="text-[9px] opacity-70 mt-0.5">
                        {new Date(it.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}