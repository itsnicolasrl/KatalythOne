import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/src/lib/env";
import { rotateRefreshToken } from "@/src/services/auth/refreshTokenService";
import { parseExpiresInToSeconds } from "@/src/lib/auth/parseExpiresIn";
import { HttpError } from "@/src/lib/errors/HttpError";
import { toErrorResponse } from "@/src/api/http/toErrorResponse";

export async function POST() {
  try {
    const store = await cookies();
    const refreshToken = store.get(env.AUTH_REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      throw new HttpError("No hay refresh token", 401, "NO_REFRESH_TOKEN");
    }

    const rotated = await rotateRefreshToken({ refreshTokenValue: refreshToken });

    const accessMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_JWT_EXPIRES_IN);
    const refreshMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_REFRESH_EXPIRES_IN);

    const res = NextResponse.json({ ok: true });

    res.cookies.set(env.AUTH_COOKIE_NAME, rotated.accessToken, {
      httpOnly: true,
      secure: env.AUTH_COOKIE_SECURE,
      sameSite: "lax",
      path: "/",
      maxAge: accessMaxAgeSeconds ?? undefined,
    });

    res.cookies.set(env.AUTH_REFRESH_COOKIE_NAME, rotated.refreshToken, {
      httpOnly: true,
      secure: env.AUTH_COOKIE_SECURE,
      sameSite: "strict",
      path: "/",
      maxAge: refreshMaxAgeSeconds ?? undefined,
    });

    return res;
  } catch (err) {
    if (err instanceof HttpError) return toErrorResponse(err);
    return toErrorResponse(new HttpError("No se pudo refrescar", 401, "REFRESH_FAILED"));
  }
}

