import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/src/lib/env";
import { revokeRefreshTokenByValue } from "@/src/services/auth/refreshTokenService";
import { parseExpiresInToSeconds } from "@/src/lib/auth/parseExpiresIn";

export async function POST() {
  const store = await cookies();
  const refreshToken = store.get(env.AUTH_REFRESH_COOKIE_NAME)?.value;

  try {
    if (refreshToken) {
      await revokeRefreshTokenByValue({ refreshTokenValue: refreshToken });
    }
  } catch {
    // Logout debe ser idempotente: incluso si falla la revocación,
    // igual limpiamos cookies en el cliente.
  }

  const accessMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_JWT_EXPIRES_IN);
  const refreshMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_REFRESH_EXPIRES_IN);

  const res = NextResponse.json({ ok: true });

  res.cookies.set(env.AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  res.cookies.set(env.AUTH_REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  // Nota: no usamos accessMaxAgeSeconds/refreshMaxAgeSeconds arriba; se dejan
  // por si deseas ajustar estrategia más adelante.
  void accessMaxAgeSeconds;
  void refreshMaxAgeSeconds;

  return res;
}

