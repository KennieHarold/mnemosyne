import { labelFromAgent, nameFromLabel, type Agent } from "@/lib/agent";

export type MemoryWrite = {
  kind: "write";
  themes: string[];
  storageId: string;
};

export type MemoryRecall = {
  kind: "recall";
  retrieved: number;
};

export type MessageMemory = MemoryWrite | MemoryRecall;

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  paragraphs: string[];
  memory?: MessageMemory;
};

export type LineageParent = {
  label: string;
  name: string;
  glyph: string;
};

export type AgentProvenance = {
  inft: string;
  root: string;
  seal: string;
  owner: string;
};

export type AgentExtras = {
  agentId: string;
  traits: string[];
  memoriesCount: number;
  provenance: AgentProvenance;
  sessionId: string;
  sessionOpenedAt: string;
  memoriesWritten: number;
};

const DEFAULT_TRAITS = [
  "curious",
  "patient",
  "literary",
  "observant",
  "honest",
  "wry",
  "lyrical",
];

const DEFAULT_SUGGESTIONS = [
  "introduce yourself",
  "what do you remember about me",
  "tell me a small truth",
];

export function getAgentExtras(label: string): AgentExtras {
  const seed = label || "agent";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const id = `0x${h.toString(16).padStart(4, "0").slice(0, 4)}`;

  return {
    agentId: id,
    traits: DEFAULT_TRAITS.slice(0, 5),
    memoriesCount: 120 + (h % 380),
    provenance: {
      inft: `0G:${id}…${(h ^ 0xa5a5).toString(16).padStart(4, "0").slice(0, 4)}`,
      root: `Qm…${(h ^ 0x5a5a).toString(16).padStart(4, "0").slice(0, 4)}`,
      seal: "aes·256·gcm",
      owner: `0x${(h ^ 0xfeed).toString(16).padStart(4, "0").slice(0, 4)}…${(h ^ 0xbeef).toString(16).padStart(4, "0").slice(0, 4)}`,
    },
    sessionId: `0x${((h * 7) >>> 0).toString(16).slice(0, 4)}·${(h % 99).toString().padStart(2, "0")}`,
    sessionOpenedAt: "today · 14:22 utc",
    memoriesWritten: 0,
  };
}

export function resolveLineageParents(
  agent: Agent,
  agents: Agent[],
): LineageParent[] {
  if (!agent.parentIds) return [];
  const byId = new Map(agents.map((a) => [a.tokenId, a]));
  const out: LineageParent[] = [];
  for (const id of agent.parentIds) {
    const parent = byId.get(id);
    if (!parent) continue;
    out.push({
      label: labelFromAgent(parent),
      name: parent.name,
      glyph: parent.glyph,
    });
  }
  return out;
}

export function getIntroMessage(label: string): ChatMessage {
  const name = nameFromLabel(label);
  return {
    id: "intro",
    role: "agent",
    paragraphs: [
      `I am ${name}. The session is sealed and the model is listening.`,
      "Tell me what's on your mind.",
    ],
  };
}

export function getSuggestions(): string[] {
  return DEFAULT_SUGGESTIONS;
}
