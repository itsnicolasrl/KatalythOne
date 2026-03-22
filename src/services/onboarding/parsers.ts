import { z } from "zod";
import type { ParsedListItem } from "@/src/services/onboarding/onboardingTypes";

function normalizeLines(input: string): string[] {
  return input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s?/, "").trim())
    .filter(Boolean);
}

function splitInline(input: string): string[] {
  // fallback si no hubo saltos de línea.
  return input
    .split(/;|•|\u2022|\|/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseMaybeList(inputRaw: string): string[] {
  const input = inputRaw.trim();
  if (!input) return [];
  const lines = normalizeLines(input);
  if (lines.length > 0) return lines;
  return splitInline(input);
}

function parseItem(entry: string): ParsedListItem {
  const line = entry.trim();
  // Formato: "Nombre: descripción"
  if (line.includes(":")) {
    const [name, ...rest] = line.split(":");
    const desc = rest.join(":").trim();
    return { name: name.trim(), description: desc || undefined };
  }
  // Formato: "Nombre - descripción"
  if (line.includes(" - ")) {
    const [name, ...rest] = line.split(" - ");
    const desc = rest.join(" - ").trim();
    return { name: name.trim(), description: desc || undefined };
  }
  return { name: line };
}

export function parseParsedListItems(inputRaw: string): ParsedListItem[] {
  const entries = parseMaybeList(inputRaw);
  return entries.map(parseItem).filter((x) => x.name.length > 0);
}

export const onboardingAnswerParsers = {
  mode: z.enum(["NEW", "EXISTING"]).transform((v) => v),
  companyName: z.string().min(2).max(120),
  companyId: z.string().min(1),
  text: z.string().min(3).max(4000),
  listText: z.string().min(1).max(8000),
};

