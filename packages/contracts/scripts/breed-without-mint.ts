import * as fs from "fs/promises";
import * as path from "path";
import * as readline from "readline/promises";
import { fileURLToPath } from "url";
import { config } from "dotenv";

import { breedWithoutMint, type DeployedAgentEntry } from "./utils/breed.ts";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deployedPath = path.resolve(__dirname, "agents-deployed.json");

const privateKey = process.env.ZG_TESTNET_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("ZG_TESTNET_PRIVATE_KEY must be set in .env");
}
const inferenceProvider = process.env.ZG_INFERENCE_PROVIDER;
if (!inferenceProvider) {
  throw new Error("ZG_INFERENCE_PROVIDER must be set in .env");
}
if (!process.env.AGENT_ENCRYPTION_KEY) {
  throw new Error("AGENT_ENCRYPTION_KEY must be set in .env");
}

const raw = await fs.readFile(deployedPath, "utf8");
const mapper = JSON.parse(raw) as DeployedAgentEntry[];
if (!Array.isArray(mapper) || mapper.length < 2) {
  throw new Error("agents-deployed.json must contain at least 2 entries");
}

const labels = mapper.map((e) => e.label);

let parent1Label = process.argv[2];
let parent2Label = process.argv[3];

if (!parent1Label || !parent2Label) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.log("\nAvailable parents:");
  for (const l of labels) console.log(`  - ${l}`);
  console.log();

  if (!parent1Label)
    parent1Label = (await rl.question("Parent 1 label: ")).trim();
  if (!parent2Label)
    parent2Label = (await rl.question("Parent 2 label: ")).trim();
  rl.close();
}

if (!labels.includes(parent1Label)) {
  throw new Error(
    `Parent 1 "${parent1Label}" not in mapper. Choose from: ${labels.join(", ")}`,
  );
}
if (!labels.includes(parent2Label)) {
  throw new Error(
    `Parent 2 "${parent2Label}" not in mapper. Choose from: ${labels.join(", ")}`,
  );
}

console.log(`\nBreeding ${parent1Label} × ${parent2Label}\n`);

const result = await breedWithoutMint({
  parent1Label,
  parent2Label,
  mapper,
  privateKey,
  inferenceProvider,
});

console.log("\n=== Child Agent (no mint) ===");
console.log(`encryptedURI: ${result.encryptedURI}`);
console.log(`metadataHash: ${result.metadataHash}`);
console.log("\nschema:");
console.dir(result.schema, { depth: null, colors: true });
