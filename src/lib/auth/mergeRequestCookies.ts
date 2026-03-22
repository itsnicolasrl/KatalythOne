import type { NextRequest } from "next/server";

/** Parsea Cookie header (un solo `=` entre nombre y valor, el resto pertenece al valor). */
function parseCookieHeader(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const segment of raw.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name) map.set(name, value);
  }
  return map;
}

/**
 * Tras rotar sesión en middleware, el navegador aún no tiene Set-Cookie aplicado.
 * Actualizamos el header Cookie del request para que layouts y Route Handlers vean los tokens nuevos.
 */
export function mergeRequestCookies(
  req: NextRequest,
  updates: Record<string, string>,
): Headers {
  const headers = new Headers(req.headers);
  const map = parseCookieHeader(req.headers.get("cookie") ?? "");
  for (const [k, v] of Object.entries(updates)) {
    map.set(k, v);
  }
  if (map.size === 0) {
    headers.delete("Cookie");
    return headers;
  }
  headers.set(
    "Cookie",
    [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
  );
  return headers;
}
