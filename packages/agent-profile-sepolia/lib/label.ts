export const PARENT_DOMAIN = "mnemo.eth";

export const TEXT_KEYS = [
  "generation",
  "tagline",
  "traits",
  "parents",
  "children",
] as const;

export type TextKey = (typeof TEXT_KEYS)[number];

export type AgentRecords = {
  label: string;
  name: string;
  address: string;
  generation: string;
  tagline: string;
  traits: string;
  parents: string;
  children: string;
};

export function normalizeLabel(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.endsWith(`.${PARENT_DOMAIN}`)) {
    return trimmed.slice(0, -1 - PARENT_DOMAIN.length);
  }
  return trimmed.replace(/\.eth$/, "");
}

export function isValidLabel(label: string): boolean {
  if (!label || label.length > 63) return false;
  if (label.startsWith("-") || label.endsWith("-")) return false;
  return /^[a-z0-9-]+$/.test(label);
}

export function ensFor(label: string): string {
  return `${label}.${PARENT_DOMAIN}`;
}

const GLYPH_MAP: Record<string, string> = {
  a: "α",
  b: "β",
  c: "χ",
  d: "δ",
  e: "ε",
  f: "φ",
  g: "γ",
  h: "η",
  i: "ι",
  j: "ϳ",
  k: "κ",
  l: "λ",
  m: "μ",
  n: "ν",
  o: "ο",
  p: "π",
  q: "ϙ",
  r: "ρ",
  s: "σ",
  t: "τ",
  u: "υ",
  v: "ϑ",
  w: "ω",
  x: "ξ",
  y: "ψ",
  z: "ζ",
};

export function glyphFor(label: string): string {
  return GLYPH_MAP[label.charAt(0).toLowerCase()] ?? "·";
}

export function displayName(label: string): string {
  if (!label) return "";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function parseList(value: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
