import type { ReactNode } from "react";

export function Section({
  id, eyebrow, title, subtitle, children, dark = false,
}: {
  id?: string; eyebrow?: string; title: string; subtitle?: string;
  children: ReactNode; dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`${dark ? "bg-black text-white" : "bg-white text-black"}`}
    >
      <div className="max-w-6xl mx-auto px-5 py-20">
        <div className="max-w-2xl mb-12">
          {eyebrow && (
            <span className="inline-block text-xs font-black uppercase tracking-widest text-[#F28705] mb-3">
              {eyebrow}
            </span>
          )}
          <h2 className={`text-4xl md:text-5xl font-black leading-[1.05] tracking-tight ${dark ? "text-white" : "text-black"}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`mt-5 text-lg leading-relaxed ${dark ? "text-white/50" : "text-black/50"}`}>
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}