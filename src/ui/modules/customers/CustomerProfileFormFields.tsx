"use client";

import type { CustomerForm, CustomerKind } from "@/src/ui/modules/customers/customerProfileForm";

export const customerProfileInputClass =
  "w-full rounded-xl border border-black/[0.1] bg-[#FAFAFA] px-4 py-3 text-sm text-black placeholder:text-black/30 outline-none focus:border-[#F28705] focus:ring-2 focus:ring-[#F28705]/15 transition-all";

export const customerProfileLabelClass =
  "block text-[10px] font-black uppercase tracking-[0.1em] text-black/40 mb-2";

type Props = {
  form: CustomerForm;
  setField: <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => void;
  nameRequired?: boolean;
};

export function CustomerProfileFormFields({ form, setField, nameRequired = true }: Props) {
  const inputClass = customerProfileInputClass;
  const labelClass = customerProfileLabelClass;

  return (
    <>
      <div>
        <p className="text-[11px] font-black text-black/50 uppercase tracking-wider mb-3">General</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              value={form.kind}
              onChange={(e) => setField("kind", e.target.value as CustomerKind)}
              className={inputClass}
            >
              <option value="PERSON">Persona</option>
              <option value="COMPANY">Empresa</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>{form.kind === "COMPANY" ? "Nombre comercial *" : "Nombre *"}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder={form.kind === "COMPANY" ? "Ej: Tienda Central" : "Ej: Ana López"}
              required={nameRequired}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-black/50 uppercase tracking-wider mb-3">Contacto principal</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="correo@ejemplo.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+57 300 000 0000"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-black/50 uppercase tracking-wider mb-3">Contacto adicional</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Email secundario</label>
            <input
              type="email"
              value={form.secondaryEmail}
              onChange={(e) => setField("secondaryEmail", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono secundario</label>
            <input
              type="tel"
              value={form.secondaryPhone}
              onChange={(e) => setField("secondaryPhone", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cargo del contacto</label>
            <input
              type="text"
              value={form.contactRole}
              onChange={(e) => setField("contactRole", e.target.value)}
              placeholder="Ej: Gerente comercial"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-black/50 uppercase tracking-wider mb-3">Identificación</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              {form.kind === "COMPANY" ? "Documento de contacto (opcional)" : "Documento de identidad"}
            </label>
            <input
              type="text"
              value={form.documentId}
              onChange={(e) => setField("documentId", e.target.value)}
              placeholder="CC, pasaporte…"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Sitio web</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              placeholder="https://"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#F28705]/20 bg-[#FFF9F2] px-4 py-3">
        <p className="text-[11px] font-black text-[#B35C00] uppercase tracking-wider mb-3">Datos de empresa (B2B)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Razón social</label>
            <input
              type="text"
              value={form.legalName}
              onChange={(e) => setField("legalName", e.target.value)}
              placeholder="Nombre legal registrado"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>ID fiscal (NIT, RFC, VAT…)</label>
            <input
              type="text"
              value={form.taxId}
              onChange={(e) => setField("taxId", e.target.value)}
              placeholder="Número tributario"
              className={inputClass}
            />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Sector / industria</label>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => setField("industry", e.target.value)}
              placeholder="Ej: Retail, SaaS, manufactura…"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-black text-black/50 uppercase tracking-wider mb-3">Ubicación</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Dirección línea 1</label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={(e) => setField("addressLine1", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Dirección línea 2</label>
            <input
              type="text"
              value={form.addressLine2}
              onChange={(e) => setField("addressLine2", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input type="text" value={form.city} onChange={(e) => setField("city", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Región / estado</label>
            <input type="text" value={form.region} onChange={(e) => setField("region", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>País</label>
            <input type="text" value={form.country} onChange={(e) => setField("country", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Código postal</label>
            <input type="text" value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Notas internas</label>
        <textarea
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          rows={4}
          placeholder="Condiciones comerciales, preferencias, advertencias…"
          className={`${inputClass} resize-y min-h-[100px]`}
        />
      </div>
    </>
  );
}
