import * as crypto from "crypto";
import { Indexer } from "@0gfoundation/0g-ts-sdk";
import { keccak256 } from "viem";

const indexerUrl = "https://indexer-storage-testnet-turbo.0g.ai";

export interface DownloadedIntelligence {
  blob: Buffer;
  metadataHash: `0x${string}`;
  intelligence: any;
}

export async function downloadIntelligence(
  rootHash: string,
): Promise<DownloadedIntelligence> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(rootHash)) {
    throw new Error("rootHash must be 0x + 64 hex chars");
  }

  const indexer = new Indexer(indexerUrl);

  const [downloaded, dlErr] = await indexer.downloadToBlob(rootHash);
  if (dlErr) {
    throw new Error(`Download failed: ${dlErr}`);
  }

  const blob = Buffer.from(await downloaded.arrayBuffer());
  const metadataHash = keccak256(blob);

  const encryptionKey = Buffer.from(process.env.AGENT_ENCRYPTION_KEY!, "hex");
  if (encryptionKey.length !== 32) {
    throw new Error("AGENT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }

  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const intelligence = JSON.parse(plaintext.toString("utf8"));

  return { blob, metadataHash, intelligence };
}
