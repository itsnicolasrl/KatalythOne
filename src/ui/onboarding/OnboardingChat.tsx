"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import type {
  ChatMessage,
  OnboardingQuestion,
  OnboardingStepKey,
} from "@/src/services/onboarding/onboardingTypes";

type CreateSessionResponse = {
  sessionId: string;
  question: OnboardingQuestion;
};

type AnswerResponse =
  | { completed: true; companyId?: string | null; sessionId: string }
  | { sessionId: string; question: OnboardingQuestion };

type ImportResponse = {
  ok: boolean;
  summary: {
    importedRows: number;
    importedCustomers: number;
    importedRevenues: number;
    importedExpenses: number;
  };
  diagnosisHints: string[];
  error?: string;
};

const ONBOARDING_CHAT_STEPS: OnboardingStepKey[] = [
  "CHOOSE_COMPANY_MODE", "COMPANY_NAME", "COMPANY_PICK",
  "BUSINESS_STAGE", "YEARS_OPERATING", "TEAM_SIZE",
  "WHAT_DOES_COMPANY_DO", "WHAT_OFFERS", "TARGET_CUSTOMER",
  "CURRENT_CLIENT_TYPE", "ACTIVE_CLIENTS", "TOP_CLIENT_CONCENTRATION",
  "BUSINESS_FLOW", "INCOME_STREAMS", "EXPENSE_CATEGORIES",
  "MONTHLY_INCOME_RANGE", "MONTHLY_EXPENSE_RANGE",
  "MATURITY_LEVEL", "GOALS", "PROBLEMS",
];

function stepIndex(stepKey: OnboardingStepKey) {
  return ONBOARDING_CHAT_STEPS.indexOf(stepKey);
}

export function OnboardingChat(props: { onCompleted?: () => void }) {
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [question, setQuestion] = React.useState<OnboardingQuestion | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [selectedValue, setSelectedValue] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setError(null);
        const preferredMode = searchParams.get("mode");
        const preferredCompanyId = searchParams.get("companyId");
        const payload =
          preferredMode === "EXISTING" && preferredCompanyId
            ? { mode: "EXISTING", companyId: preferredCompanyId }
            : undefined;

        const res = await fetch("/api/onboarding/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload ?? {}),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "No se pudo iniciar onboarding");
        }
        const data = (await res.json()) as CreateSessionResponse;
        if (cancelled) return;
        setSessionId(data.sessionId);
        setQuestion(data.question);
        setMessages([{ id: crypto.randomUUID(), role: "bot", content: data.question.prompt }]);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error de red");
      }
    }
    init();
    return () => { cancelled = true; };
  }, [searchParams]);

  async function sendAnswer(payload: { value: string; display: string }) {
    if (!sessionId || !question) return;
    setLoading(true);
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: payload.display },
    ]);
    try {
      const res = await fetch(`/api/onboarding/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answer: payload.value }),
      });
      const json = await res.json().catch(() => null) as AnswerResponse | { error?: unknown } | null;
      if (!res.ok) {
        const maybe = json as { error?: unknown } | null;
        throw new Error(maybe && typeof maybe.error === "string" ? maybe.error : "No se pudo enviar la respuesta");
      }
      const data = json as AnswerResponse;
      if ("completed" in data) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "bot", content: "✦ Modelo digital inicial generado. Ya puedes continuar con métricas y alertas." },
        ]);
        setQuestion(null);
        props.onCompleted?.();
        return;
      }
      setQuestion(data.question);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "bot", content: data.question.prompt },
      ]);
      if (data.question.input.type === "textarea") setDraft("");
      if (data.question.input.type === "select") setSelectedValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  function canSend() {
    if (!question || loading) return false;
    if (question.input.type === "textarea") return draft.trim().length > 0;
    if (question.input.type === "select") return selectedValue.trim().length > 0;
    return true;
  }

  const progress = question ? stepIndex(question.stepKey) : -1;
  const progressPercent = question && progress >= 0
    ? Math.round(((progress + 1) / ONBOARDING_CHAT_STEPS.length) * 100)
    : 100;
  const selectOptions = question?.input.type === "select" ? question.input.options : [];
  const preferredCompanyId = searchParams.get("companyId");
  const showImportBlock = searchParams.get("mode") === "EXISTING" || Boolean(preferredCompanyId);

  React.useEffect(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }, [messages]);

  async function onImportFile(file: File) {
    try {
      setUploading(true);
      setError(null);
      const fd = new FormData();
      fd.append("file", file);
      if (preferredCompanyId) fd.append("companyId", preferredCompanyId);
      const res = await fetch("/api/onboarding/import", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json().catch(() => null)) as ImportResponse | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "No se pudo importar el archivo");
      const hints = data.diagnosisHints.map((h) => `· ${h}`).join("\n");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          content:
            `✦ Importación completada.\n` +
            `Filas: ${data.summary.importedRows} · Clientes: ${data.summary.importedCustomers} · ` +
            `Ingresos: ${data.summary.importedRevenues} · Gastos: ${data.summary.importedExpenses}\n\n${hints}`,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full space-y-4">

      {/* ── BANNER ── */}
      <div className="bg-[#0A0A0A] rounded-2xl px-5 py-4 md:px-6 md:py-5 relative overflow-hidden flex-shrink-0">
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
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-[#F28705]/15 border border-[#F28705]/30 rounded-full px-3 py-1 text-[10px] font-black text-[#F28705] mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
              Onboarding conversacional
            </div>
            <h2 className="text-xl font-black text-white leading-tight tracking-tight">
              {question ? "Construyendo tu modelo digital" : "Modelo generado"}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Responde en lenguaje natural y genera tu modelo digital vivo
            </p>
          </div>

          {/* Barra de progreso en el banner */}
          <div className="w-64 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">
                {question
                  ? `Paso ${Math.max(progress + 1, 1)} de ${ONBOARDING_CHAT_STEPS.length}`
                  : "Completado"}
              </span>
              <span className="text-xs font-black text-[#F28705]">{progressPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#F28705] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY: chat a ancho completo; columna lateral solo si hay importación (empresa existente) ── */}
      <div
        className={[
          "flex-1 grid grid-cols-1 gap-4 min-h-0",
          showImportBlock ? "lg:grid-cols-[minmax(0,1fr)_minmax(280px,300px)]" : "",
        ].join(" ")}
      >

        {/* Chat principal */}
        <div className="bg-white rounded-2xl border border-black/[0.06] flex flex-col overflow-hidden min-h-[260px] lg:min-h-0">

          {/* Error */}
          {error && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          {/* Mensajes — zona scrolleable */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-5 py-5 space-y-3 min-h-0"
          >
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-2 text-xs text-black/30">
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Iniciando onboarding...
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "bot" ? "flex justify-start" : "flex justify-end"}
              >
                {/* Avatar bot */}
                {m.role === "bot" && (
                  <div className="w-7 h-7 rounded-lg bg-[#FFF3E0] border border-[#F28705]/20 flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8L7 12L13 4" stroke="#F28705" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <div
                  className={[
                    "max-w-xl text-sm leading-relaxed whitespace-pre-line rounded-2xl px-4 py-3",
                    m.role === "bot"
                      ? "bg-[#F5F4F2] text-black border border-black/[0.06]"
                      : "bg-[#F28705] text-white",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg bg-[#FFF3E0] border border-[#F28705]/20 flex items-center justify-center flex-shrink-0 mr-2.5">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L7 12L13 4" stroke="#F28705" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="bg-[#F5F4F2] border border-black/[0.06] rounded-2xl px-4 py-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-black/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-black/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-black/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input area — fija abajo */}
          <div className="flex-shrink-0 border-t border-black/[0.06] p-4">
            {question ? (
              <>
                {/* Botones */}
                {question.input.type === "buttons" && (
                  <div className="flex flex-wrap gap-2">
                    {question.input.options.map((opt) => (
                      <button
                        key={opt.value}
                        disabled={loading}
                        onClick={() => sendAnswer({ value: opt.value, display: opt.label })}
                        className="rounded-xl border border-black/[0.1] bg-[#F5F4F2] hover:bg-[#F28705] hover:text-white hover:border-[#F28705] disabled:opacity-50 transition-colors px-4 py-2.5 text-xs font-bold text-black/70"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Select */}
                {question.input.type === "select" && (
                  <div className="flex gap-2">
                    <select
                      value={selectedValue}
                      onChange={(e) => setSelectedValue(e.target.value)}
                      className="flex-1 rounded-xl border border-black/[0.1] bg-[#F5F4F2] text-black px-4 py-2.5 text-sm outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all"
                    >
                      <option value="" disabled>Selecciona una opción...</option>
                      {question.input.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      disabled={!canSend()}
                      onClick={() => sendAnswer({
                        value: selectedValue,
                        display: selectOptions.find((o) => o.value === selectedValue)?.label ?? selectedValue,
                      })}
                      className="rounded-xl bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-40 transition-colors text-white text-sm font-bold px-5 py-2.5 flex items-center gap-1.5"
                    >
                      Continuar
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>
                )}

                {/* Textarea */}
                {question.input.type === "textarea" && (
                  <div className="space-y-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={question.input.placeholder ?? "Escribe tu respuesta..."}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend()) {
                          sendAnswer({ value: draft, display: draft.trim() });
                        }
                      }}
                      className="w-full min-h-[90px] rounded-xl border border-black/[0.1] bg-[#F5F4F2] text-black px-4 py-3 text-sm outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all resize-none placeholder:text-black/30"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-black/30">⌘ + Enter para enviar</span>
                      <button
                        disabled={!canSend()}
                        onClick={() => sendAnswer({ value: draft, display: draft.trim() })}
                        className="rounded-xl bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-40 transition-colors text-white text-sm font-bold px-5 py-2 flex items-center gap-1.5"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                              <path d="M21 12a9 9 0 00-9-9"/>
                            </svg>
                            Generando...
                          </>
                        ) : (
                          <>
                            Enviar
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="22" y1="2" x2="11" y2="13"/>
                              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Completado */
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-emerald-800">Onboarding completado</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Puedes volver al dashboard y comenzar a cargar ingresos y gastos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showImportBlock ? (
          <div className="flex flex-col gap-3 min-h-0">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
              <p className="text-xs font-black text-black mb-1">Importación masiva</p>
              <p className="text-[10px] text-black/45 mb-4 leading-relaxed">
                Sube un Excel o CSV de tu empresa existente para acelerar el diagnóstico inicial.
              </p>
              <div className="space-y-2">
                <a
                  href="/templates/katalyth-import-template.csv"
                  download
                  className="flex items-center gap-2 w-full rounded-xl border border-black/[0.08] bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-3 py-2.5 text-xs font-bold text-black/60"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Descargar plantilla CSV
                </a>
                <label className="flex items-center gap-2 w-full rounded-xl border border-[#F28705]/30 bg-[#FFF3E0] hover:bg-[#F28705]/15 transition-colors px-3 py-2.5 text-xs font-bold text-[#F28705] cursor-pointer">
                  {uploading ? (
                    <>
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                        <path d="M21 12a9 9 0 00-9-9"/>
                      </svg>
                      Importando...
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Subir archivo Excel / CSV
                    </>
                  )}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onImportFile(file);
                      e.currentTarget.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}