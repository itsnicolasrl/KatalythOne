import { describe, expect, it, vi } from "vitest";

describe("requireSameOrigin", () => {
  it("no lanza si el origin coincide con APP_BASE_URL", async () => {
    vi.stubEnv("APP_BASE_URL", "http://example.com");
    vi.resetModules();

    const { requireSameOrigin } = await import("@/src/api/http/originCheck");

    const req = new Request("http://api.local", {
      headers: { origin: "http://example.com" },
    });

    expect(() => requireSameOrigin(req)).not.toThrow();
  });

  it("lanza 403 si origin host no coincide", async () => {
    vi.stubEnv("APP_BASE_URL", "http://example.com");
    vi.resetModules();

    const { requireSameOrigin } = await import("@/src/api/http/originCheck");

    const req = new Request("http://api.local", {
      headers: { origin: "http://evil.com" },
    });

    let err: unknown;
    try {
      requireSameOrigin(req);
    } catch (e) {
      err = e;
    }

    expect(err).toBeTruthy();
    if (typeof err === "object" && err !== null) {
      const e = err as { statusCode?: number; code?: string };
      expect(e.statusCode).toBe(403);
      expect(e.code).toBe("CSRF_FORBIDDEN");
    }
  });

  it("acepta referer si origin no existe", async () => {
    vi.stubEnv("APP_BASE_URL", "https://acme.test");
    vi.resetModules();

    const { requireSameOrigin } = await import("@/src/api/http/originCheck");

    const req = new Request("http://api.local", {
      headers: { referer: "https://acme.test/dashboard" },
    });

    expect(() => requireSameOrigin(req)).not.toThrow();
  });

  it("lanza 403 si faltan origin y referer", async () => {
    vi.stubEnv("APP_BASE_URL", "http://example.com");
    vi.resetModules();

    const { requireSameOrigin } = await import("@/src/api/http/originCheck");

    const req = new Request("http://api.local");

    let err: unknown;
    try {
      requireSameOrigin(req);
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    if (typeof err === "object" && err !== null) {
      const e = err as { statusCode?: number; code?: string };
      expect(e.statusCode).toBe(403);
      expect(e.code).toBe("CSRF_FORBIDDEN");
    }
  });
});

