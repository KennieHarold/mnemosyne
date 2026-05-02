import "server-only";

import { type Hex } from "viem";
import type { AgentIntelligence } from "../lib/breed-events";
import {
  encryptAndUploadIntelligence,
  type UploadedIntelligence,
} from "./intelligence";
import { readEncryptionKey, requireEnv } from "./utils";

export type PreparedGenesisMint = UploadedIntelligence & {
  schema: AgentIntelligence;
};

export async function prepareGenesisMint(
  schema: AgentIntelligence,
): Promise<PreparedGenesisMint> {
  const privateKey = requireEnv("ZG_TESTNET_PRIVATE_KEY");
  const encryptionKey = readEncryptionKey();

  const { encryptedURI, metadataHash } = await encryptAndUploadIntelligence(
    schema,
    encryptionKey,
    privateKey,
  );

  return { encryptedURI, metadataHash, schema };
}

export type { Hex };
