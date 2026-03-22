"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export type CompanySelectionRow = {
  companyId: string;
  role: string;
  company: { id: string; name: string; logoUrl?: string | null; createdAt: string | Date };
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function roleLabel(role: string) {
  switch (role.toUpperCase()) {
    case "OWNER":  return "Propietario";
    case "ADMIN":  return "Administrador";
    case "MEMBER": return "Miembro";
    default:       return role;
  }
}

function roleStyles(role: string) {
  switch (role.toUpperCase()) {
    case "OWNER":  return "bg-[#FFF3E0] text-[#F28705]";
    case "ADMIN":  return "bg-blue-50 text-blue-600";
    default:       return "bg-[#F5F4F2] text-black/50";
  }
}

export function CompanySelectionTable(props: {
  memberships: CompanySelectionRow[];
  activeCompanyId: string | null;
}) {
  const router = useRouter();
  const [busyCompanyId, setBusyCompanyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editModal, setEditModal] = React.useState<{
    companyId: string;
    currentName: string;
    currentLogoUrl: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{
    companyId: string;
    companyName: string;
  } | null>(null);
  const [editNameDraft, setEditNameDraft] = React.useState("");
  const [editLogoDraft, setEditLogoDraft] = React.useState("");

  async function onSelect(companyId: string) {
    setBusyCompanyId(companyId);
    setError(null);
    try {
      const res = await fetch("/api/companies/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ companyId }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo seleccionar la empresa");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setBusyCompanyId(null);
    }
  }

  function openEditModal(companyId: string, currentName: string, currentLogoUrl?: string | null) {
    setEditModal({
      companyId,
      currentName,
      currentLogoUrl: currentLogoUrl ?? "",
    });
    setEditNameDraft(currentName);
    setEditLogoDraft(currentLogoUrl ?? "");
  }

  async function onSaveEdit() {
    if (!editModal) return;
    const companyId = editModal.companyId;
    const name = editNameDraft.trim();
    if (!name) {
      setError("El nombre de la empresa no puede estar vacío");
      return;
    }
    setBusyCompanyId(companyId);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${editModal.companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          logoUrl: editLogoDraft.trim() ? editLogoDraft.trim() : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo editar la empresa");
      setEditModal(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setBusyCompanyId(null);
    }
  }

  function openDeleteModal(companyId: string, companyName: string) {
    setDeleteModal({ companyId, companyName });
  }

  async function onConfirmDelete() {
    if (!deleteModal) return;
    const companyId = deleteModal.companyId;
    setBusyCompanyId(companyId);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${deleteModal.companyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "No se pudo eliminar la empresa");
      setDeleteModal(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setBusyCompanyId(null);
    }
  }

  if (props.memberships.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-xs text-black/40">Aún no tienes empresas registradas.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Error */}
      {error && (
        <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
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

      {/* Header tabla */}
      <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-black/[0.05]">
        <div className="col-span-5">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">Empresa</p>
        </div>
        <div className="col-span-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">Rol</p>
        </div>
        <div className="col-span-2">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">Creada</p>
        </div>
        <div className="col-span-3 text-right">
          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/30">Acciones</p>
        </div>
      </div>

      {/* Filas */}
      {props.memberships.map((m) => {
        const isActive = props.activeCompanyId === m.companyId;
        const isBusy   = busyCompanyId === m.companyId;
        const canDelete = m.role.toUpperCase() === "OWNER";
        const createdAt =
          typeof m.company.createdAt === "string"
            ? new Date(m.company.createdAt)
            : m.company.createdAt;

        return (
          <div
            key={m.companyId}
            className={[
              "grid grid-cols-12 gap-4 px-5 py-4 border-b border-black/[0.05] items-center transition-colors",
              isActive ? "bg-[#FFFBF5]" : "hover:bg-[#F5F4F2]",
            ].join(" ")}
          >
            {/* Empresa */}
            <div className="col-span-5 flex items-center gap-3">
              {/* Avatar */}
              <div className={[
                "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0",
                isActive ? "bg-[#F28705] text-white" : "bg-[#F5F4F2] text-black/50",
              ].join(" ")}>
                {initials(m.company.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-black truncate">{m.company.name}</p>
                <p className="text-[10px] text-black/40 mt-0.5 font-mono">
                  {m.companyId.slice(0, 8)}…
                </p>
              </div>
              {/* Badge activa */}
              {isActive && (
                <span className="flex items-center gap-1 bg-[#FFF3E0] border border-[#F28705]/20 text-[#F28705] text-[9px] font-black px-2 py-1 rounded-full flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F28705]" />
                  Activa
                </span>
              )}
            </div>

            {/* Rol */}
            <div className="col-span-2">
              <span className={[
                "text-[10px] font-black px-2.5 py-1 rounded-lg",
                roleStyles(m.role),
              ].join(" ")}>
                {roleLabel(m.role)}
              </span>
            </div>

            {/* Fecha */}
            <div className="col-span-2">
              <p className="text-xs text-black/50 font-medium">
                {createdAt.toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Acciones */}
            <div className="col-span-3 flex items-center justify-end gap-2">
              <button
                disabled={isBusy}
                onClick={() => openEditModal(m.companyId, m.company.name, m.company.logoUrl)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] disabled:opacity-50 transition-colors px-3 py-2 rounded-lg"
              >
                Editar
              </button>
              {isActive ? (
                <button
                  onClick={() => router.push(`/dashboard/companies/${m.companyId}/memberships`)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] transition-colors px-3 py-2 rounded-lg"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                    <path d="M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                  Roles
                </button>
              ) : (
                <>
                  <button
                    disabled={isBusy}
                    onClick={() => void onSelect(m.companyId)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-[#F28705] hover:bg-[#F25C05] disabled:opacity-50 transition-colors px-3 py-2 rounded-lg"
                  >
                    {isBusy ? (
                      <>
                        <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                          <path d="M21 12a9 9 0 00-9-9"/>
                        </svg>
                        Activando...
                      </>
                    ) : (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                        Activar
                      </>
                    )}
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => router.push(`/dashboard/companies/${m.companyId}/memberships`)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-black/50 hover:text-black bg-[#F5F4F2] hover:bg-black/[0.07] disabled:opacity-50 transition-colors px-3 py-2 rounded-lg"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                      <path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    Roles
                  </button>
                </>
              )}
              <button
                disabled={isBusy || !canDelete}
                onClick={() => openDeleteModal(m.companyId, m.company.name)}
                title={!canDelete ? "Solo el propietario (OWNER) puede eliminar la empresa" : "Eliminar empresa"}
                className={[
                  "flex items-center gap-1.5 text-[10px] font-bold transition-colors px-3 py-2 rounded-lg",
                  canDelete
                    ? "text-red-700/80 hover:text-red-700 bg-red-50 hover:bg-red-100"
                    : "text-black/35 bg-black/[0.05] cursor-not-allowed",
                  (isBusy || !canDelete) ? "opacity-50" : "",
                ].join(" ")}
              >
                Eliminar
              </button>
            </div>
          </div>
        );
      })}

      {editModal ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white shadow-xl">
            <div className="px-5 py-4 border-b border-black/[0.06]">
              <p className="text-base font-black text-black">Editar empresa</p>
              <p className="text-xs text-black/45 mt-1">
                Actualiza nombre y logo de la empresa.
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] font-bold text-black/60">Nombre</label>
                <input
                  value={editNameDraft}
                  onChange={(e) => setEditNameDraft(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-black/60">URL del logo (opcional)</label>
                <input
                  value={editLogoDraft}
                  onChange={(e) => setEditLogoDraft(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-black/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setEditModal(null)}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-[#F5F4F2] text-black/70 hover:bg-black/[0.08]"
              >
                Cancelar
              </button>
              <button
                disabled={busyCompanyId === editModal.companyId}
                onClick={() => void onSaveEdit()}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-[#F28705] text-white hover:bg-[#F25C05] disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModal ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white shadow-xl">
            <div className="px-5 py-4 border-b border-black/[0.06]">
              <p className="text-base font-black text-black">Eliminar empresa</p>
              <p className="text-xs text-black/45 mt-1">
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-black/80">
                ¿Seguro que deseas eliminar <span className="font-bold">"{deleteModal.companyName}"</span>?
              </p>
            </div>
            <div className="px-5 py-4 border-t border-black/[0.06] flex justify-end gap-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-[#F5F4F2] text-black/70 hover:bg-black/[0.08]"
              >
                Cancelar
              </button>
              <button
                disabled={busyCompanyId === deleteModal.companyId}
                onClick={() => void onConfirmDelete()}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Eliminar empresa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}