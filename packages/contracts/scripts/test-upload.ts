import * as crypto from "crypto";
import * as fs from "fs/promises";
import { JsonRpcProvider, Wallet } from "ethers";
import { keccak256 } from "viem";
import { Indexer, ZgFile } from "@0gfoundation/0g-ts-sdk";
import { config } from "dotenv";

config();

const input = process.argv[2];
if (!input) {
  throw new Error("Usage: tsx test-upload.ts <plaintext>");
}

const indexerUrl = "https://indexer-storage-testnet-turbo.0g.ai";
const indexer = new Indexer(indexerUrl);

const rpcUrl = "https://evmrpc-testnet.0g.ai";
const provider = new JsonRpcProvider(rpcUrl);
const signer = new Wallet(process.env.ZG_TESTNET_PRIVATE_KEY!, provider);

// 1. Load the agent's symmetric key from env
const encryptionKey = Buffer.from(process.env.AGENT_ENCRYPTION_KEY!, "hex");
if (encryptionKey.length !== 32) {
  throw new Error("AGENT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
}
const iv = crypto.randomBytes(12);

// 2. Encrypt with AES-256-GCM
const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
const plaintext = Buffer.from(input);
const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const authTag = cipher.getAuthTag();

const blob = Buffer.concat([iv, authTag, ciphertext]);

// 3. Write to a temp file (0G SDK takes a file path)
const tmpPath = `/tmp/agent-${Date.now()}.enc`;
await fs.writeFile(tmpPath, blob);

// 4. Upload to 0G Storage
const file = await ZgFile.fromFilePath(tmpPath);
const [tree, treeErr] = await file.merkleTree();
if (treeErr) throw new Error(`Merkle tree failed: ${treeErr}`);

const [, err] = await indexer.upload(file, rpcUrl, signer as any);
if (err) {
  throw new Error(`Upload failed: ${err}`);
}

await file.close();
await fs.unlink(tmpPath);

const rootHash = tree!.rootHash();
const metadataHash = keccak256(blob);

console.table({
  encryptedURI: rootHash, // Merkle root as the storage handle
  metadataHash, // commit hash to put on-chain
});
