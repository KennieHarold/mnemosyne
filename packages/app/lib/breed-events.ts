import type { Hex } from "viem";

export type AgentMemory = {
  facts: string[];
  recent_episodes: unknown[];
  themes: string[];
  generation_meta: {
    born_at: number | null;
    interaction_count: number;
  };
};

export type AgentIntelligence = {
  displayName: string;
  ensLabel: string;
  tagline: string;
  systemPrompt: string;
  traits: string[];
  skills: string[];
  memory: AgentMemory;
};

export type ParentSummary = {
  label: string;
  tokenId: string;
  displayName: string;
  tagline: string;
  generation: number;
};

export type ServerBreedPhase =
  | "fetch-parents"
  | "decrypt"
  | "merge"
  | "encrypt";

export type BreedPhase =
  | "idle"
  | ServerBreedPhase
  | "mint"
  | "ens"
  | "complete"
  | "error";

export type BreedEvent =
  | { type: "phase"; phase: ServerBreedPhase }
  | { type: "parents"; parents: [ParentSummary, ParentSummary] }
  | {
      type: "ready-to-mint";
      encryptedURI: Hex;
      metadataHash: Hex;
      schema: AgentIntelligence;
      parent1TokenId: string;
      parent2TokenId: string;
    }
  | { type: "error"; message: string };
