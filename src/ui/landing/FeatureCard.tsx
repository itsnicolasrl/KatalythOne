import type { ComponentType } from "react";

export function FeatureCard({
  icon: Icon, title, description, dark = false,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string; description: string; dark?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-6 border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
      dark
        ? "bg-white/5 border-white/10 hover:border-[#F28705]/40"
        : "bg-white border-black/8 hover:border-[#F28705]/40 shadow-sm"
    }`}>
      <div className="h-11 w-11 rounded-2xl bg-[#F28705]/10 border border-[#F28705]/20 flex items-center justify-center mb-5">
        <Icon className="h-5 w-5 text-[#F28705]" />
      </div>
      <p className={`text-base font-black ${dark ? "text-white" : "text-black"}`}>{title}</p>
      <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-white/50" : "text-black/50"}`}>
        {description}
      </p>
    </div>
  );
}