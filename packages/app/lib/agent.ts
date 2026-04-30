import type { Address } from "viem";

export type Agent = {
  tokenId: bigint;
  owner: Address;
  name: string;
  ens: string;
  generation: number;
  parentIds: [bigint, bigint] | null;
  tagline: string;
  chats: number;
  children: number;
  glyph: string;
};

export const TOTAL_GENERATIONS = 6;

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

export function glyphForLabel(label: string): string {
  const first = label.trim().charAt(0).toLowerCase();
  return GLYPH_MAP[first] ?? "·";
}

export function nameFromLabel(label: string): string {
  if (!label) return "";
  return label.charAt(0).toUpperCase() + label.slice(1);
}
