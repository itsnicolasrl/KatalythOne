import { HttpError } from "@/src/lib/errors/HttpError";

export function sanitizeText(input: string, opts?: { maxLen?: number }) {
  const maxLen = opts?.maxLen ?? 1000;
  const trimmed = input.trim();

  // Eliminamos caracteres de control y signos típicos que podrían introducir HTML.
  const noControls = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  const noTags = noControls.replace(/[<>]/g, "");

  return noTags.length > maxLen ? noTags.slice(0, maxLen) : noTags;
}

export function sanitizePermissionKey(input: string) {
  const key = sanitizeText(input, { maxLen: 120 });
  // Permitimos un set conservador de caracteres para keys estables.
  const ok = /^[a-zA-Z0-9_.:-]+$/.test(key);
  if (!ok) throw new HttpError("Clave de permiso inválida", 400, "PERMISSION_KEY_INVALID");
  return key;
}

