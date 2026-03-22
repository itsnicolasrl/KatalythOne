import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/src/lib/auth/jwt";
import { mergeRequestCookies } from "@/src/lib/auth/mergeRequestCookies";
import { env } from "@/src/lib/env";
import { rotateRefreshToken } from "@/src/services/auth/refreshTokenService";
import type { RefreshRotationResult } from "@/src/services/auth/refreshTokenService";
import { parseExpiresInToSeconds } from "@/src/lib/auth/parseExpiresIn";

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
  runtime: "nodejs",
};

/** Rutas API que no deben exigir access JWT en el middleware (login, refresh, webhooks, etc.). */
function isPublicApiPath(pathname: string) {
  const publicPrefixes = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/health",
    "/api/stripe/webhook",
    "/api/account/recover",
  ];
  return publicPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function setSessionCookies(res: NextResponse, rotated: RefreshRotationResult) {
  const accessMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_JWT_EXPIRES_IN);
  const refreshMaxAgeSeconds = parseExpiresInToSeconds(env.AUTH_REFRESH_EXPIRES_IN);

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
}

function nextWithRotatedSession(req: NextRequest, rotated: RefreshRotationResult) {
  const requestHeaders = mergeRequestCookies(req, {
    [env.AUTH_COOKIE_NAME]: rotated.accessToken,
    [env.AUTH_REFRESH_COOKIE_NAME]: rotated.refreshToken,
  });
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  setSessionCookies(res, rotated);
  return res;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");

  if (isApi && isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(env.AUTH_COOKIE_NAME)?.value;
  const refreshToken = req.cookies.get(env.AUTH_REFRESH_COOKIE_NAME)?.value;

  const redirectToLogin = () => {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  };

  const failUnauthorized = () => {
    if (isApi) {
      return NextResponse.json(
        { error: "No autorizado", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    return redirectToLogin();
  };

  if (!accessToken) {
    if (refreshToken) {
      try {
        const rotated = await rotateRefreshToken({ refreshTokenValue: refreshToken });
        return nextWithRotatedSession(req, rotated);
      } catch {
        return failUnauthorized();
      }
    }
    return failUnauthorized();
  }

  try {
    verifyAccessToken(accessToken);
    return NextResponse.next();
  } catch {
    if (!refreshToken) return failUnauthorized();
    try {
      const rotated = await rotateRefreshToken({ refreshTokenValue: refreshToken });
      return nextWithRotatedSession(req, rotated);
    } catch {
      return failUnauthorized();
    }
  }
}
