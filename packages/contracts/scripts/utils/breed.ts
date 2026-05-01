import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { JsonRpcProvider, Wallet } from "ethers";
import OpenAI from "openai";
import type { Hex } from "viem";

import { downloadIntelligence } from "./download.ts";
import { uploadIntelligence, type UploadedIntelligence } from "./upload.ts";

const rpcUrl = "https://evmrpc-testnet.0g.ai";

export interface DeployedAgentEntry {
  label: string;
  encryptedURI: Hex;
  metadataHash: Hex;
}

export interface AgentMemory {
  facts: string[];
  recent_episodes: unknown[];
  themes: string[];
  generation_meta: {
    born_at: number | null;
    interaction_count: number;
  };
}

export interface AgentIntelligence {
  displayName: string;
  ensLabel: string;
  tagline: string;
  systemPrompt: string;
  traits: string[];
  skills: string[];
  memory: AgentMemory;
}

export interface ParentSnapshot {
  label: string;
  encryptedURI: Hex;
  metadataHash: Hex;
  intelligence: AgentIntelligence;
}

export interface BreedingResult extends UploadedIntelligence {
  schema: AgentIntelligence;
  parents: { label: string; encryptedURI: Hex }[];
}

export interface BreedOptions {
  parent1Label: string;
  parent2Label: string;
  mapper: DeployedAgentEntry[];
  privateKey: string;
  inferenceProvider: string;
  rpcUrl?: string;
}

type Broker = Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;

export async function breedWithoutMint(
  options: BreedOptions,
): Promise<BreedingResult> {
  const { parent1Label, parent2Label, mapper, privateKey, inferenceProvider } =
    options;

  if (parent1Label === parent2Label) {
    throw new Error("Self-breeding not allowed: parent labels must differ");
  }

  const p1Entry = findEntry(mapper, parent1Label);
  const p2Entry = findEntry(mapper, parent2Label);

  const provider = new JsonRpcProvider(
    rpcUrl,
    { chainId: 16601, name: "0g-testnet" },
    { staticNetwork: true },
  );
  const signer = new Wallet(privateKey, provider);
  const broker = await withRetry(
    () => createZGComputeNetworkBroker(signer as any),
    "createZGComputeNetworkBroker",
  );
  await withRetry(
    () => broker.inference.acknowledgeProviderSigner(inferenceProvider),
    "acknowledgeProviderSigner",
  );

  const [p1, p2] = await Promise.all([
    loadParent(p1Entry),
    loadParent(p2Entry),
  ]);

  const merged = await mergeIntelligence(p1, p2, broker, inferenceProvider);
  const childName = await generateChildName(
    p1,
    p2,
    merged,
    broker,
    inferenceProvider,
    mapper,
  );
  const finalSystemPrompt = await rewriteSystemPromptWithName(
    childName,
    merged,
    broker,
    inferenceProvider,
  );

  const generationFromParents =
    Math.max(
      parentGeneration(p1.intelligence),
      parentGeneration(p2.intelligence),
    ) + 1;

  const schema: AgentIntelligence = {
    displayName: capitalize(childName),
    ensLabel: childName,
    tagline: truncate(merged.tagline ?? "", 80),
    systemPrompt: finalSystemPrompt,
    traits: clampArray(merged.traits ?? [], 5),
    skills: clampArray(merged.skills ?? [], 8),
    memory: {
      facts: clampArray(merged.facts ?? [], 8),
      recent_episodes: [],
      themes: clampArray(merged.themes ?? [], 5),
      generation_meta: {
        born_at: Math.floor(Date.now() / 1000),
        interaction_count: 0,
      },
    },
  };

  // Seed lineage memory so the child knows where it came from
  const lineageFact = `I was born from the union of ${p1.intelligence.displayName} and ${p2.intelligence.displayName}. Generation ${generationFromParents}.`;
  if (!schema.memory.facts.includes(lineageFact)) {
    schema.memory.facts = [lineageFact, ...schema.memory.facts].slice(0, 8);
  }

  const uploaded = await uploadIntelligence(JSON.stringify(schema));

  return {
    encryptedURI: uploaded.encryptedURI,
    metadataHash: uploaded.metadataHash,
    schema,
    parents: [
      { label: p1.label, encryptedURI: p1.encryptedURI },
      { label: p2.label, encryptedURI: p2.encryptedURI },
    ],
  };
}

function findEntry(
  mapper: DeployedAgentEntry[],
  label: string,
): DeployedAgentEntry {
  const entry = mapper.find((e) => e.label === label);
  if (!entry) {
    throw new Error(
      `Agent "${label}" not found in mapper. Available: ${mapper.map((e) => e.label).join(", ")}`,
    );
  }
  return entry;
}

async function loadParent(entry: DeployedAgentEntry): Promise<ParentSnapshot> {
  const { intelligence } = await downloadIntelligence(entry.encryptedURI);
  return {
    label: entry.label,
    encryptedURI: entry.encryptedURI,
    metadataHash: entry.metadataHash,
    intelligence: intelligence as AgentIntelligence,
  };
}

interface MergedDraft {
  tagline: string;
  systemPrompt: string;
  traits: string[];
  skills: string[];
  facts: string[];
  themes: string[];
}

async function mergeIntelligence(
  p1: ParentSnapshot,
  p2: ParentSnapshot,
  broker: Broker,
  inferenceProvider: string,
): Promise<MergedDraft> {
  const a = p1.intelligence;
  const b = p2.intelligence;

  const userPrompt = `You are merging two AI agents into a child agent.

PARENT A: ${a.displayName} (${a.ensLabel})
- Tagline: ${a.tagline}
- Identity: ${a.systemPrompt}
- Traits: ${(a.traits ?? []).join(", ")}
- Skills: ${(a.skills ?? []).join(", ")}
- Themes: ${(a.memory?.themes ?? []).join(", ")}

PARENT B: ${b.displayName} (${b.ensLabel})
- Tagline: ${b.tagline}
- Identity: ${b.systemPrompt}
- Traits: ${(b.traits ?? []).join(", ")}
- Skills: ${(b.skills ?? []).join(", ")}
- Themes: ${(b.memory?.themes ?? []).join(", ")}

Produce a child agent that genuinely inherits from both parents. The child
should feel like a coherent character, not a Frankenstein concatenation.
Some traits should clearly come from one parent or the other; some should
be emergent from the combination. The child's voice should be distinct
from either parent.

Output STRICT JSON ONLY (no markdown, no commentary) matching this shape:
{
  "tagline": "<under 80 chars, evocative, no quotes>",
  "systemPrompt": "<2-4 sentences defining the child's personality and voice>",
  "traits": ["<3-5 dominant traits>"],
  "skills": ["<inherited and emergent skills, max 8>"],
  "facts": ["<3-6 stable self-facts written in first person>"],
  "themes": ["<3-5 thematic tags>"]
}`;

  const raw = await chatComplete(
    broker,
    inferenceProvider,
    [
      { role: "system", content: "You output only valid JSON." },
      { role: "user", content: userPrompt },
    ],
    userPrompt,
  );

  return extractJSON(raw) as MergedDraft;
}

async function generateChildName(
  p1: ParentSnapshot,
  p2: ParentSnapshot,
  child: MergedDraft,
  broker: Broker,
  inferenceProvider: string,
  mapper: DeployedAgentEntry[],
): Promise<string> {
  const taken = mapper.map((e) => e.label).join(", ");

  const namePrompt = `Two AI agents have been merged into a child. Pick the
name of a real or fictional character — historical figure, philosopher,
mythological figure, literary character, etc. — whose archetype most closely
resembles the child described below. The name itself becomes the child's
identity, so choose one that fits.

PARENT A: ${p1.intelligence.displayName} — ${p1.intelligence.tagline}
PARENT B: ${p2.intelligence.displayName} — ${p2.intelligence.tagline}

CHILD:
- Tagline: ${child.tagline}
- Identity: ${child.systemPrompt}
- Traits: ${(child.traits ?? []).join(", ")}
- Themes: ${(child.themes ?? []).join(", ")}

Names already taken (DO NOT reuse): ${taken}

Output ONLY the character's name as a single word, lowercase, alphanumeric
only, 4-12 chars. Use the commonly-known short form (e.g. "sherlock" not
"sherlockholmes", "quixote" not "donquixote"). No quotes, no explanation, no
punctuation.`;

  const raw = await chatComplete(
    broker,
    inferenceProvider,
    [{ role: "user", content: namePrompt }],
    namePrompt,
  );

  let name = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (name.length < 4 || name.length > 12) {
    name = `${p1.label}${p2.label}`.replace(/[^a-z0-9]/g, "").slice(0, 12);
    if (name.length < 4) {
      name = `child${Date.now().toString(36)}`.slice(0, 12);
    }
  }

  return ensureUniqueLabel(name, mapper);
}

async function rewriteSystemPromptWithName(
  childName: string,
  merged: MergedDraft,
  broker: Broker,
  inferenceProvider: string,
): Promise<string> {
  const displayName = capitalize(childName);
  const prompt = `Rewrite the following AI agent system prompt so it opens
with "You are ${displayName}" and refers to the agent as ${displayName}
throughout. Preserve the personality, voice, traits, and substance exactly —
only the naming should change. If the existing prompt uses a different name
or a placeholder, replace it with ${displayName}.

Output only the rewritten system prompt: 2-4 sentences, no quotes, no
markdown, no commentary.

EXISTING SYSTEM PROMPT:
${merged.systemPrompt ?? ""}

TRAITS: ${(merged.traits ?? []).join(", ")}
THEMES: ${(merged.themes ?? []).join(", ")}`;

  const raw = await chatComplete(
    broker,
    inferenceProvider,
    [{ role: "user", content: prompt }],
    prompt,
  );

  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  return cleaned.length > 0 ? cleaned : (merged.systemPrompt ?? "");
}

async function chatComplete(
  broker: Broker,
  inferenceProvider: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  signedContent: string,
): Promise<string> {
  const { endpoint, model } = await withRetry(
    () => broker.inference.getServiceMetadata(inferenceProvider),
    "getServiceMetadata",
  );

  // Headers are signed against `signedContent` and are typically single-use,
  // so re-acquire them on every retry attempt.
  const completion = await withRetry(async () => {
    const headers = await broker.inference.getRequestHeaders(
      inferenceProvider,
      signedContent,
    );
    const openai = new OpenAI({
      baseURL: endpoint,
      apiKey: "",
      defaultHeaders: headers as any,
    });
    return openai.chat.completions.create({
      model,
      messages,
      stream: false,
    });
  }, "chat.completions.create");

  return completion.choices[0]?.message?.content ?? "";
}

const RETRYABLE_CODES = new Set([
  "TIMEOUT",
  "NETWORK_ERROR",
  "SERVER_ERROR",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  attempts = 4,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || i === attempts - 1) break;
      const delay = 1000 * 2 ** i;
      console.warn(
        `[breed] ${label} failed (attempt ${i + 1}/${attempts}): ${errMessage(err)} — retrying in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    code?: string;
    cause?: { code?: string };
    message?: string;
  };
  if (e.code && RETRYABLE_CODES.has(e.code)) return true;
  if (e.cause?.code && RETRYABLE_CODES.has(e.cause.code)) return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("socket hang up") ||
    msg.includes("fetch failed")
  );
}

function errMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function extractJSON(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
  // If the model added prose around the JSON, try to grab the first {...} block
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(jsonText);
}

function ensureUniqueLabel(base: string, mapper: DeployedAgentEntry[]): string {
  const taken = new Set(mapper.map((e) => e.label));
  if (!taken.has(base)) return base;
  for (let i = 1; i < 100; i++) {
    const candidate = `${base}${i}`.slice(0, 12);
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Could not find unique label derived from "${base}"`);
}

function parentGeneration(intel: AgentIntelligence): number {
  // Genesis agents have no explicit generation field; treat them as 0.
  // Bred children may carry it inside generation_meta in future versions.
  const meta = intel.memory?.generation_meta as
    | { generation?: number }
    | undefined;
  return typeof meta?.generation === "number" ? meta.generation : 0;
}

function clampArray<T>(arr: T[], max: number): T[] {
  return Array.isArray(arr) ? arr.slice(0, max) : [];
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
