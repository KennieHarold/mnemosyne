import * as crypto from "crypto";
import { Indexer } from "@0gfoundation/0g-ts-sdk";
import { keccak256 } from "viem";
import { config } from "dotenv";

config();

const rootHash = process.argv[2];
if (!rootHash || !/^0x[0-9a-fA-F]{64}$/.test(rootHash)) {
  throw new Error("Usage: tsx test-download.ts <rootHash> (0x + 64 hex chars)");
}

const indexerUrl = "https://indexer-storage-testnet-turbo.0g.ai";
const indexer = new Indexer(indexerUrl);

// 1. Download the encrypted blob from 0G Storage.
const [downloaded, dlErr] = await indexer.downloadToBlob(rootHash);
if (dlErr) {
  throw new Error(`Download failed: ${dlErr}`);
}

const blob = Buffer.from(await downloaded.arrayBuffer());

// 2. Verify the on-chain commit hash matches what was stored.
const metadataHash = keccak256(blob);

// 3. Load the agent's symmetric key from env
const encryptionKey = Buffer.from(process.env.AGENT_ENCRYPTION_KEY!, "hex");
if (encryptionKey.length !== 32) {
  throw new Error("AGENT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
}

// 4. Decrypt with AES-256-GCM
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

console.table({
  encryptedURI: rootHash,
  metadataHash,
  name: intelligence.name,
  generation: intelligence.generation,
  version: intelligence.version,
});

console.log("\nDecrypted intelligence:");
console.log(intelligence);
