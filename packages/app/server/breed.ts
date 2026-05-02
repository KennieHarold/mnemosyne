import "server-only";

import * as crypto from "crypto";
import { JsonRpcProvider, Wallet } from "ethers";
import OpenAI from "openai";
import { Indexer } from "@0gfoundation/0g-ts-sdk";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { createPublicClient, http, type Hex } from "viem";

import { mnemoAgentNftAbi, mnemoAgentNftAddress } from "../lib/contracts";
import { zeroGGalileoTestnet } from "../lib/wagmi";
import type {
  AgentIntelligence,
  BreedEvent,
  ParentSummary,
} from "../lib/breed-events";
import {
  capitalize,
  clampArray,
  extractJSON,
  readEncryptionKey,
  requireEnv,
  truncate,
  withRetry,
} from "./utils";
import { encryptAndUploadIntelligence } from "./intelligence";

const RPC_URL = "https://evmrpc-testnet.0g.ai";
const INDEXER_URL = "https://indexer-storage-testnet-turbo.0g.ai";

type Broker = Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;

type ParentSnapshot = {
  label: string;
  tokenId: bigint;
  encryptedURI: Hex;
  intelligence: AgentIntelligence;
};

type MergedDraft = {
  tagline: string;
  systemPrompt: string;
  traits: string[];
  skills: string[];
  facts: string[];
  themes: string[];
};

const publicClient = createPublicClient({
  chain: zeroGGalileoTestnet,
  transport: http(),
});

export type BreedIntelligenceArgs = {
  parent1Label: string;
  parent2Label: string;
};

export async function* breedIntelligenceStream(
  args: BreedIntelligenceArgs,
): AsyncGenerator<BreedEvent, void, void> {
  const { parent1Label, parent2Label } = args;

  if (!parent1Label || !parent2Label) {
    yield {
      type: "error",
      message: "parent1Label and parent2Label are required",
    };
    return;
  }
  if (parent1Label === parent2Label) {
    yield {
      type: "error",
      message: "Self-breeding not allowed: parent labels must differ",
    };
    return;
  }

  const privateKey = requireEnv("ZG_TESTNET_PRIVATE_KEY");
  const inferenceProvider = requireEnv("ZG_INFERENCE_PROVIDER");
  const encryptionKey = readEncryptionKey();

  yield { type: "phase", phase: "fetch-parents" };

  const [p1Resolved, p2Resolved] = await Promise.all([
    resolveParent(parent1Label),
    resolveParent(parent2Label),
  ]);

  yield { type: "phase", phase: "decrypt" };

  const [p1, p2] = await Promise.all([
    loadParentIntelligence(p1Resolved, encryptionKey),
    loadParentIntelligence(p2Resolved, encryptionKey),
  ]);

  const parentSummaries: [ParentSummary, ParentSummary] = [
    parentSummary(p1),
    parentSummary(p2),
  ];
  yield { type: "parents", parents: parentSummaries };

  yield { type: "phase", phase: "merge" };

  const provider = new JsonRpcProvider(
    RPC_URL,
    { chainId: zeroGGalileoTestnet.id, name: "0g-testnet" },
    { staticNetwork: true },
  );
  const signer = new Wallet(privateKey, provider);
  const broker = await withRetry(
    () =>
      createZGComputeNetworkBroker(
        signer as unknown as Parameters<
          typeof createZGComputeNetworkBroker
        >[0],
      ),
    "createZGComputeNetworkBroker",
  );
  await withRetry(
    () => broker.inference.acknowledgeProviderSigner(inferenceProvider),
    "acknowledgeProviderSigner",
  );

  const merged = await mergeIntelligence(p1, p2, broker, inferenceProvider);
  const takenLabels = await fetchTakenLabels();
  const childName = await generateChildName(
    p1,
    p2,
    merged,
    broker,
    inferenceProvider,
    takenLabels,
  );
  const finalSystemPrompt = await rewriteSystemPromptWithName(
    childName,
    merged,
    broker,
    inferenceProvider,
  );

  const generation =
    Math.max(parentGeneration(p1.intelligence), parentGeneration(p2.intelligence)) +
    1;

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

  const lineageFact = `I was born from the union of ${p1.intelligence.displayName} and ${p2.intelligence.displayName}. Generation ${generation}.`;
  if (!schema.memory.facts.includes(lineageFact)) {
    schema.memory.facts = [lineageFact, ...schema.memory.facts].slice(0, 8);
  }

  yield { type: "phase", phase: "encrypt" };

  const { encryptedURI, metadataHash } = await uploadEncryptedSchema(
    schema,
    encryptionKey,
    privateKey,
  );

  yield {
    type: "ready-to-mint",
    encryptedURI,
    metadataHash,
    schema,
    parent1TokenId: p1.tokenId.toString(),
    parent2TokenId: p2.tokenId.toString(),
  };
}

async function resolveParent(
  label: string,
): Promise<{ label: string; tokenId: bigint; encryptedURI: Hex }> {
  const tokenId = (await publicClient.readContract({
    address: mnemoAgentNftAddress,
    abi: mnemoAgentNftAbi,
    functionName: "tokenIdForLabel",
    args: [label],
  })) as bigint;

  const hashes = (await publicClient.readContract({
    address: mnemoAgentNftAddress,
    abi: mnemoAgentNftAbi,
    functionName: "dataHashesOf",
    args: [tokenId],
  })) as readonly Hex[];

  const first = hashes[0];
  if (!first) {
    throw new Error(`agent ${label} has no data hashes on chain`);
  }
  return { label, tokenId, encryptedURI: first };
}

async function loadParentIntelligence(
  resolved: { label: string; tokenId: bigint; encryptedURI: Hex },
  encryptionKey: Buffer,
): Promise<ParentSnapshot> {
  const indexer = new Indexer(INDEXER_URL);
  const [downloaded, dlErr] = await indexer.downloadToBlob(
    resolved.encryptedURI,
  );
  if (dlErr) {
    throw new Error(`download failed for ${resolved.label}: ${dlErr}`);
  }

  const blob = Buffer.from(await downloaded.arrayBuffer());
  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const intelligence = JSON.parse(
    plaintext.toString("utf8"),
  ) as AgentIntelligence;

  return {
    label: resolved.label,
    tokenId: resolved.tokenId,
    encryptedURI: resolved.encryptedURI,
    intelligence,
  };
}

function parentSummary(p: ParentSnapshot): ParentSummary {
  return {
    label: p.label,
    tokenId: p.tokenId.toString(),
    displayName: p.intelligence.displayName,
    tagline: p.intelligence.tagline,
    generation: parentGeneration(p.intelligence),
  };
}

async function fetchTakenLabels(): Promise<string[]> {
  const next = (await publicClient.readContract({
    address: mnemoAgentNftAddress,
    abi: mnemoAgentNftAbi,
    functionName: "nextTokenId",
  })) as bigint;

  const total = Number(next);
  if (total === 0) return [];

  const results = await Promise.all(
    Array.from({ length: total }, (_, i) =>
      publicClient
        .readContract({
          address: mnemoAgentNftAddress,
          abi: mnemoAgentNftAbi,
          functionName: "labelForTokenId",
          args: [BigInt(i)],
        })
        .catch(() => ""),
    ),
  );

  return results.filter(
    (label): label is string => typeof label === "string" && label.length > 0,
  );
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
  takenLabels: string[],
): Promise<string> {
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

Names already taken (DO NOT reuse): ${takenLabels.join(", ")}

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

  return ensureUniqueLabel(name, takenLabels);
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

  const completion = await withRetry(async () => {
    const headers = await broker.inference.getRequestHeaders(
      inferenceProvider,
      signedContent,
    );
    const openai = new OpenAI({
      baseURL: endpoint,
      apiKey: "",
      defaultHeaders: headers as unknown as Record<string, string>,
    });
    return openai.chat.completions.create({
      model,
      messages,
      stream: false,
    });
  }, "chat.completions.create");

  return completion.choices[0]?.message?.content ?? "";
}

async function uploadEncryptedSchema(
  schema: AgentIntelligence,
  encryptionKey: Buffer,
  privateKey: string,
): Promise<{ encryptedURI: Hex; metadataHash: Hex }> {
  return encryptAndUploadIntelligence(schema, encryptionKey, privateKey);
}

function ensureUniqueLabel(base: string, taken: string[]): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let i = 1; i < 100; i++) {
    const candidate = `${base}${i}`.slice(0, 12);
    if (!set.has(candidate)) return candidate;
  }
  throw new Error(`Could not find unique label derived from "${base}"`);
}

function parentGeneration(intel: AgentIntelligence): number {
  const meta = intel.memory?.generation_meta as
    | { generation?: number }
    | undefined;
  return typeof meta?.generation === "number" ? meta.generation : 0;
}
