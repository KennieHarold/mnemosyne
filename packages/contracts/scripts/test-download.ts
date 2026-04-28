import { config } from "dotenv";
import { downloadIntelligence } from "./utils/download.ts";

config();

const rootHash = process.argv[2];
if (!rootHash) {
  throw new Error("Usage: tsx test-download.ts <rootHash> (0x + 64 hex chars)");
}

const { metadataHash, intelligence } = await downloadIntelligence(rootHash);

console.table({
  encryptedURI: rootHash,
  metadataHash,
  name: intelligence.name,
  generation: intelligence.generation,
  version: intelligence.version,
});

console.log("\nDecrypted intelligence:");
console.log(intelligence);
