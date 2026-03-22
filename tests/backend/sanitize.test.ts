import { describe, expect, it } from "vitest";
import { sanitizePermissionKey, sanitizeText } from "@/src/lib/sanitize";
import { HttpError } from "@/src/lib/errors/HttpError";

describe("sanitizeText", () => {
  it("recorta espacios y elimina caracteres peligrosos < >", () => {
    const input = "  <script>alert(1)</script>  ";
    const out = sanitizeText(input);
    expect(out).toBe("scriptalert(1)/script");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
  });

  it("elimina caracteres de control", () => {
    const input = "hola\u0007mundo";
    expect(sanitizeText(input)).toBe("holamundo");
  });

  it("respeta maxLen", () => {
    const input = "a".repeat(2000);
    const out = sanitizeText(input, { maxLen: 100 });
    expect(out.length).toBe(100);
  });
});

describe("sanitizePermissionKey", () => {
  it("acepta keys válidas", () => {
    expect(sanitizePermissionKey("owner:users.read")).toBe("owner:users.read");
    expect(sanitizePermissionKey("ADMIN_users:write")).toBe("ADMIN_users:write");
  });

  it("rechaza keys inválidas", () => {
    expect(() => sanitizePermissionKey("bad key!")).toThrow(HttpError);
  });
});

