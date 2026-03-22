"use client";
import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-4 z-50 px-5 pointer-events-none">
      <div className="max-w-5xl mx-auto pointer-events-auto">
        <nav className="bg-white border border-black/[0.08] rounded-full px-5 py-2 pr-2 flex items-center justify-between gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05)]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/Icono Normal.svg" alt="" className="h-6 w-6" />
            <span className="text-sm font-black text-black tracking-tight">Katalyth One</span>
          </Link>

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            <Link href="/" className="text-sm font-bold text-black px-3.5 py-1.5 rounded-full hover:bg-black/5 transition-colors">
              Inicio
            </Link>

            <button className="flex items-center gap-1 text-sm font-semibold text-black/55 px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-black transition-colors">
              Producto
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <button className="flex items-center gap-1 text-sm font-semibold text-black/55 px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-black transition-colors">
              Funcionalidades
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <a href="#precios" className="text-sm font-semibold text-black/55 px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-black transition-colors">
              Precios
            </a>

            {/* Divisor */}
            <div className="w-px h-4 bg-black/10 mx-1" />

            <a href="#" className="text-sm font-semibold text-black/55 px-3.5 py-1.5 rounded-full hover:bg-black/5 hover:text-black transition-colors">
              Docs
            </a>
          </div>

          {/* Derecha */}
          <div className="hidden md:flex items-center gap-1 flex-shrink-0">
            <Link href="/login" className="text-sm font-semibold text-black/55 hover:text-black px-4 py-2 rounded-full hover:bg-black/5 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register">
              <button className="flex items-center gap-2 bg-[#F28705] hover:bg-[#F25C05] transition-colors text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-[0_2px_12px_rgba(242,135,5,0.35)]">
                Crear cuenta
              </button>
            </Link>
          </div>

          {/* Hamburger móvil */}
          <button
            className="md:hidden p-2 rounded-full hover:bg-black/5 transition-colors"
            onClick={() => setOpen(!open)}
          >
            <div className="w-4 h-0.5 bg-black mb-1 transition-all" style={{ transform: open ? "rotate(45deg) translate(1px, 5px)" : "none" }} />
            <div className="w-4 h-0.5 bg-black mb-1 transition-all" style={{ opacity: open ? 0 : 1 }} />
            <div className="w-4 h-0.5 bg-black transition-all" style={{ transform: open ? "rotate(-45deg) translate(1px, -5px)" : "none" }} />
          </button>
        </nav>

        {/* Menú móvil */}
        {open && (
          <div className="mt-2 bg-white border border-black/[0.08] rounded-3xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex flex-col gap-1">
            {[["Inicio","/"],["Producto","#"],["Funcionalidades","#funcionalidades"],["Precios","#precios"],["Docs","#"],["Blog","#"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm font-semibold text-black/70 px-4 py-2.5 rounded-2xl hover:bg-black/5 hover:text-black transition-colors" onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <div className="h-px bg-black/6 my-1" />
            <Link href="/login" className="text-sm font-semibold text-black/60 px-4 py-2.5 rounded-2xl hover:bg-black/5 transition-colors" onClick={() => setOpen(false)}>
              Iniciar sesión
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <button className="w-full bg-[#F28705] text-white text-sm font-bold py-3 rounded-full mt-1">
                Crear cuenta
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}