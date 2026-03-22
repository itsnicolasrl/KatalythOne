"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();
  const [next, setNext] = React.useState("/dashboard/companies");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextRaw = params.get("next") ?? "/dashboard/companies";
    const safe = nextRaw.startsWith("/") ? nextRaw : "/dashboard/companies";
    setNext(safe);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo crear la cuenta");
        return;
      }
      router.push(`/login?next=${encodeURIComponent(next)}`);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-y-auto flex flex-col items-center justify-center py-14 px-8">

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <img src="/Icono Normal.svg" alt="Katalyth One" className="h-7 w-auto" />
        <span className="text-sm font-bold text-gray-900 tracking-tight">Katalyth One</span>
      </div>

      {/* Título centrado */}
      <h1 className="text-5xl font-black text-gray-900 leading-[1.05] text-center mb-10">
        Crear<br />cuenta
      </h1>

      {/* Inputs con ancho limitado */}
      <div className="flex flex-col gap-3 w-[78%]">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-full border border-gray-200 bg-white px-5 py-3.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#e07830] focus:ring-2 focus:ring-[#e07830]/20 transition"
        />

        <div className="relative w-full">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-full border border-gray-200 bg-white px-5 py-3.5 pr-12 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-[#e07830] focus:ring-2 focus:ring-[#e07830]/20 transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            {showPassword ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {error && (
          <p className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-2xl text-center">
            {error}
          </p>
        )}

        {/* Botón principal */}
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-full bg-[#F28705] hover:bg-[#F25C05] active:scale-[0.98] transition-all py-3.5 text-sm font-bold text-white shadow-lg shadow-[#F28705]/25 disabled:opacity-60 mt-1"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 w-[78%] my-5">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">o regístrate con</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Social */}
      <div className="flex justify-center gap-3">
        <button className="w-11 h-11 rounded-full bg-[#fff7f0] hover:bg-[#fce8d5] transition border border-[#fcd5b0] flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </button>
        <button className="w-11 h-11 rounded-full bg-[#fff7f0] hover:bg-[#fce8d5] transition border border-[#fcd5b0] flex items-center justify-center">
          <svg width="17" height="17" viewBox="0 0 21 21">
            <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
            <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
            <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
            <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
          </svg>
        </button>
        <button className="w-11 h-11 rounded-full bg-[#fff7f0] hover:bg-[#fce8d5] transition border border-[#fcd5b0] flex items-center justify-center">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#1a1a1a">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </button>
      </div>

      {/* Terms */}
      <p className="text-[11px] text-center text-gray-400 mt-6 leading-relaxed w-[78%]">
        Al crear una cuenta aceptas nuestros{" "}
        <a href="/terms" className="text-[#F28705] hover:underline font-medium">Términos de servicio</a>
        {" "}y{" "}
        <a href="/privacy" className="text-[#F28705] hover:underline font-medium">Política de privacidad.</a>
      </p>

      {/* Volver al login */}
      <p className="text-sm text-center text-gray-500 mt-4">
        ¿Ya tienes cuenta?{" "}
        <button
          onClick={() => router.push(`/login?next=${encodeURIComponent(next)}`)}
          className="text-[#F28705] font-bold hover:underline"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  );
}