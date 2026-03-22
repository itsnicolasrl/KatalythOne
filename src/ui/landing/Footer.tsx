import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0A0A0A] relative overflow-hidden">
      {/* Línea de acento superior */}
      <div className="h-[3px] bg-gradient-to-r from-[#F28705] via-[#F25C05] to-transparent" />

      <div className="px-12 pt-16 relative">
        {/* Marca de agua gigante */}
        <span
          className="absolute bottom-0 left-8 text-[110px] font-black text-white/[0.03] leading-none tracking-[-6px] select-none pointer-events-none whitespace-nowrap"
          aria-hidden="true"
        >
          KATALYTH
        </span>

        {/* Grid principal */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-white/[0.06]">
          
          {/* Columna marca */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-[#F28705] rounded-[10px] flex items-center justify-center flex-shrink-0">
                <img src="/Icono Normal.svg" alt="" className="h-5 w-5 brightness-0 invert" />
              </div>
              <span className="text-base font-black text-white tracking-tight">Katalyth One</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-[220px] mb-7">
              Sistema operativo para empresas que crecen con estructura y datos reales.
            </p>
            <Link href="/register">
              <button className="inline-flex items-center gap-2.5 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-5 py-2.5 rounded-full">
                Empezar gratis
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">→</span>
              </button>
            </Link>
          </div>

          {/* Producto */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25 mb-5">Producto</p>
            <div className="flex flex-col gap-3">
              {[
                ["Cómo funciona", "#como-funciona"],
                ["Funcionalidades", "#funcionalidades"],
                ["Precios", "#precios"],
              ].map(([label, href]) => (
                <a key={label} href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Cuenta + Legal */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25 mb-5">Cuenta</p>
            <div className="flex flex-col gap-3 mb-7">
              <Link href="/register" className="text-sm text-[#F28705] font-semibold hover:text-[#F25C05] transition-colors">
                Crear cuenta
              </Link>
              <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
                Iniciar sesión
              </Link>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25 mb-5">Legal</p>
            <div className="flex flex-col gap-3">
              {[["Términos", "#"], ["Privacidad", "#"], ["Seguridad", "#"]].map(([label, href]) => (
                <a key={label} href={href} className="text-sm text-white/50 hover:text-white transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Contacto */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/25 mb-5">Contacto</p>
            <div className="flex flex-col gap-4">
              {[
                {
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  ),
                  text: "contacto@katalyth.one",
                },
                {
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  ),
                  text: "Bogotá, Colombia",
                },
                {
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F28705" strokeWidth="2.5">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.49 10.5a19.79 19.79 0 01-3.07-8.67A2 2 0 013.4 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 7.91a16 16 0 006.29 6.29l.79-.79a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  ),
                  text: "+57 300 000 0000",
                },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 bg-white/[0.06] rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <span className="text-xs text-white/50 leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-5">
          <span className="text-xs text-white/25">
            © {year} Katalyth One. Todos los derechos reservados.
          </span>

          {/* Indicador de estado */}
          <div className="flex items-center gap-2 text-xs text-white/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" />
            Todos los sistemas operativos
          </div>

          <div className="flex items-center gap-6">
            {["Términos", "Privacidad", "Seguridad"].map((l) => (
              <a key={l} href="#" className="text-xs text-white/25 hover:text-white/60 transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}