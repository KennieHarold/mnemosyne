import { glyphForLabel } from "@/lib/agent";
import type { AgentIntelligence } from "@/lib/breed-events";

export type MintFormState = {
  name: string;
  tagline: string;
  systemPrompt: string;
  traits: string[];
  skills: string[];
  facts: string[];
  themes: string[];
};

export const EMPTY_MINT_FORM: MintFormState = {
  name: "",
  tagline: "",
  systemPrompt: "",
  traits: [],
  skills: [],
  facts: [],
  themes: [],
};

export const MINT_LIMITS = {
  name: { min: 2, max: 20 },
  tagline: { min: 6, max: 80 },
  systemPrompt: { min: 60, max: 1200 },
  traits: { min: 3, max: 5, perChipMax: 24 },
  skills: { min: 3, max: 8, perChipMax: 36 },
  facts: { min: 3, max: 6, perFactMax: 200 },
  themes: { min: 3, max: 5, perChipMax: 24 },
} as const;

export const THEMES_TOOLTIP =
  "themes are thematic tags surfaced across conversations — concepts your agent keeps returning to. think 'virtue', 'geometry', 'paradox', 'observation', 'longing'. they shape what the agent notices and what its descendants inherit.";

export function normalizeEnsLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function capitalizeDisplay(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function isValidEnsLabel(label: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label);
}

export type MintPreview = {
  displayName: string;
  ensLabel: string;
  ens: string;
  glyph: string;
  seed: number;
  tagline: string;
  traits: string[];
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

export function buildPreview(form: MintFormState): MintPreview | null {
  const ensLabel = normalizeEnsLabel(form.name);
  if (!ensLabel) return null;
  return {
    displayName: capitalizeDisplay(form.name),
    ensLabel,
    ens: `${ensLabel}.mnemo.eth`,
    glyph: glyphForLabel(ensLabel),
    seed: hash(ensLabel),
    tagline: form.tagline.trim(),
    traits: form.traits,
  };
}

export type MintValidation =
  | { ok: true; schema: AgentIntelligence }
  | { ok: false; error: string };

function clean(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((s) => s.length > 0);
}

export function validateMintForm(form: MintFormState): MintValidation {
  const name = (form.name ?? "").trim();
  if (name.length < MINT_LIMITS.name.min) {
    return { ok: false, error: "name is too short" };
  }
  if (name.length > MINT_LIMITS.name.max) {
    return { ok: false, error: `name must be at most ${MINT_LIMITS.name.max} characters` };
  }

  const ensLabel = normalizeEnsLabel(name);
  if (!isValidEnsLabel(ensLabel)) {
    return {
      ok: false,
      error: "name must contain a-z, 0-9, or hyphens (not at edges)",
    };
  }

  const tagline = (form.tagline ?? "").trim();
  if (tagline.length < MINT_LIMITS.tagline.min) {
    return { ok: false, error: "tagline is required" };
  }
  if (tagline.length > MINT_LIMITS.tagline.max) {
    return {
      ok: false,
      error: `tagline must be at most ${MINT_LIMITS.tagline.max} characters`,
    };
  }

  const systemPrompt = (form.systemPrompt ?? "").trim();
  if (systemPrompt.length < MINT_LIMITS.systemPrompt.min) {
    return {
      ok: false,
      error: `system prompt must be at least ${MINT_LIMITS.systemPrompt.min} characters`,
    };
  }
  if (systemPrompt.length > MINT_LIMITS.systemPrompt.max) {
    return {
      ok: false,
      error: `system prompt must be at most ${MINT_LIMITS.systemPrompt.max} characters`,
    };
  }

  const traits = clean(form.traits);
  if (traits.length < MINT_LIMITS.traits.min) {
    return { ok: false, error: `add at least ${MINT_LIMITS.traits.min} traits` };
  }

  const skills = clean(form.skills);
  if (skills.length < MINT_LIMITS.skills.min) {
    return { ok: false, error: `add at least ${MINT_LIMITS.skills.min} skills` };
  }

  const facts = clean(form.facts);
  if (facts.length < MINT_LIMITS.facts.min) {
    return { ok: false, error: `add at least ${MINT_LIMITS.facts.min} self-facts` };
  }

  const themes = clean(form.themes);
  if (themes.length < MINT_LIMITS.themes.min) {
    return { ok: false, error: `add at least ${MINT_LIMITS.themes.min} themes` };
  }

  const schema: AgentIntelligence = {
    displayName: capitalizeDisplay(name),
    ensLabel,
    tagline,
    systemPrompt,
    traits: traits.slice(0, MINT_LIMITS.traits.max),
    skills: skills.slice(0, MINT_LIMITS.skills.max),
    memory: {
      facts: facts.slice(0, MINT_LIMITS.facts.max),
      recent_episodes: [],
      themes: themes.slice(0, MINT_LIMITS.themes.max),
      generation_meta: {
        born_at: Math.floor(Date.now() / 1000),
        interaction_count: 0,
      },
    },
  };

  return { ok: true, schema };
}

export function isFormReady(form: MintFormState): boolean {
  return validateMintForm(form).ok;
}

export type MintPhase =
  | "idle"
  | "schema"
  | "encrypt"
  | "mint"
  | "texts"
  | "complete"
  | "error";

export const MINT_PHASE_ORDER: MintPhase[] = [
  "idle",
  "schema",
  "encrypt",
  "mint",
  "texts",
  "complete",
];
