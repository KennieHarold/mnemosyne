import * as crypto from "crypto";
import * as fs from "fs/promises";
import { JsonRpcProvider, Wallet } from "ethers";
import { type Hex, keccak256 } from "viem";
import { Indexer, ZgFile } from "@0gfoundation/0g-ts-sdk";

const indexerUrl = "https://indexer-storage-testnet-turbo.0g.ai";
const rpcUrl = "https://evmrpc-testnet.0g.ai";

export interface UploadedIntelligence {
  encryptedURI: Hex;
  metadataHash: Hex;
}

export async function uploadIntelligence(
  plaintext: string | Buffer,
): Promise<UploadedIntelligence> {
  const indexer = new Indexer(indexerUrl);
  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(process.env.ZG_TESTNET_PRIVATE_KEY!, provider);

  const encryptionKey = Buffer.from(process.env.AGENT_ENCRYPTION_KEY!, "hex");
  if (encryptionKey.length !== 32) {
    throw new Error("AGENT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const data = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const blob = Buffer.concat([iv, authTag, ciphertext]);

  const tmpPath = `/tmp/agent-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.enc`;
  await fs.writeFile(tmpPath, blob);

  try {
    const file = await ZgFile.fromFilePath(tmpPath);
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr) throw new Error(`Merkle tree failed: ${treeErr}`);

    const [, err] = await indexer.upload(file, rpcUrl, signer as any);
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
