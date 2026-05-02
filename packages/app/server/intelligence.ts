import "server-only";

import * as crypto from "crypto";
import * as fs from "fs/promises";
import { ethers } from "ethers";
import { Indexer, ZgFile } from "@0gfoundation/0g-ts-sdk";
import { keccak256, type Hex } from "viem";
import type { AgentIntelligence } from "../lib/breed-events";

const RPC_URL = "https://evmrpc-testnet.0g.ai";
const INDEXER_URL = "https://indexer-storage-testnet-turbo.0g.ai";

export type UploadedIntelligence = {
  encryptedURI: Hex;
  metadataHash: Hex;
};

export async function encryptAndUploadIntelligence(
  schema: AgentIntelligence,
  encryptionKey: Buffer,
  privateKey: string,
): Promise<UploadedIntelligence> {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const data = Buffer.from(JSON.stringify(schema));
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, authTag, ciphertext]);

  const tmpPath = `/tmp/agent-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")}.enc`;
  await fs.writeFile(tmpPath, blob);

  try {
    const file = await ZgFile.fromFilePath(tmpPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr) throw new Error(`Merkle tree failed: ${treeErr}`);

    const indexer = new Indexer(INDEXER_URL);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(privateKey, provider);

    const [, err] = await indexer.upload(
      file,
      RPC_URL,
      signer as unknown as Parameters<typeof indexer.upload>[2],
    );
    if (err) {
      throw new Error(`Upload failed: ${err}`);
    }

    await file.close();

    const encryptedURI = tree!.rootHash() as Hex;
    const metadataHash = keccak256(blob);
    return { encryptedURI, metadataHash };
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
