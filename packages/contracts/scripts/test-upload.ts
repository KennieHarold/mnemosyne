import { config } from "dotenv";
import { uploadIntelligence } from "./utils/upload.ts";

config();

const input = process.argv[2];
if (!input) {
  throw new Error("Usage: tsx test-upload.ts <plaintext>");
}

const { encryptedURI, metadataHash } = await uploadIntelligence(input);

console.table({
  encryptedURI,
  metadataHash,
});
