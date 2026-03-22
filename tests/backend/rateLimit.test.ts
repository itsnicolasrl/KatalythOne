import { describe, expect, it, vi } from "vitest";
import { enforceRateLimit } from "@/src/api/http/rateLimit";
import { HttpError } from "@/src/lib/errors/HttpError";

describe("enforceRateLimit", () => {
  it("bloquea después de max requests dentro de la ventana", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));

    const key = `rl|test|${Math.random()}`;
    await enforceRateLimit({ key, max: 2, windowMs: 10_000 });
    await enforceRateLimit({ key, max: 2, windowMs: 10_000 });

    let err: unknown;
    try {
      await enforceRateLimit({ key, max: 2, windowMs: 10_000 });
    } catch (e) {
      err = e;
    }

    expect(err).toBeInstanceOf(HttpError);
    if (err instanceof HttpError) {
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe("RATE_LIMITED");
    }

    vi.useRealTimers();
  });

  it("resetea el contador al expirar windowMs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T12:00:00.000Z"));

    const key = `rl|test-reset|${Math.random()}`;
    await enforceRateLimit({ key, max: 2, windowMs: 1_000 });
    await enforceRateLimit({ key, max: 2, windowMs: 1_000 });

    vi.setSystemTime(new Date("2026-03-19T12:00:01.100Z"));

    // Tras el reset ya no debería fallar (enforceRateLimit es síncrono)
    expect(() => enforceRateLimit({ key, max: 2, windowMs: 1_000 })).not.toThrow();

    vi.useRealTimers();
  });
});

