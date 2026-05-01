import * as fs from "fs/promises";
import * as path from "path";
import * as readline from "readline/promises";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { Contract, JsonRpcProvider, Wallet, type Log } from "ethers";

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
const contractAddress = process.env.MNEMO_NFT_ADDRESS;
if (!contractAddress) {
  throw new Error("MNEMO_NFT_ADDRESS must be set in .env");
}
const contractRpcUrl = "https://evmrpc-testnet.0g.ai";

const NFT_ABI = [
  "function isLabelTaken(string label) view returns (bool)",
  "function tokenIdForLabel(string label) view returns (uint256)",
  "function breed(uint256 parent1Id, uint256 parent2Id, address to, bytes[] proofs, string[] dataDescriptions, string label) returns (uint256 childTokenId)",
  "event Bred(uint256 indexed childTokenId, uint256 indexed parent1, uint256 indexed parent2, address breeder, uint256 generation)",
  "event SubnameIssued(uint256 indexed tokenId, string label, address indexed holder)",
] as const;

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
if (parent1Label === parent2Label) {
  throw new Error("Self-breeding not allowed: parent labels must differ");
}

const provider = new JsonRpcProvider(contractRpcUrl);
const signer = new Wallet(privateKey, provider);
const recipient =
  (process.env.MINT_RECIPIENT as string | undefined) ?? signer.address;
const nft = new Contract(contractAddress, NFT_ABI, signer);

const [p1Taken, p2Taken] = (await Promise.all([
  nft.isLabelTaken(parent1Label),
  nft.isLabelTaken(parent2Label),
])) as [boolean, boolean];
if (!p1Taken) {
  throw new Error(`Parent 1 "${parent1Label}" is not minted on-chain`);
}
if (!p2Taken) {
  throw new Error(`Parent 2 "${parent2Label}" is not minted on-chain`);
}

const [parent1TokenId, parent2TokenId] = (await Promise.all([
  nft.tokenIdForLabel(parent1Label),
  nft.tokenIdForLabel(parent2Label),
])) as [bigint, bigint];

console.log(
  `\nBreeding ${parent1Label} (#${parent1TokenId}) × ${parent2Label} (#${parent2TokenId})`,
);
console.log(`  contract: ${contractAddress}`);
console.log(`  signer:   ${signer.address}`);
console.log(`  to:       ${recipient}\n`);

const result = await breedWithoutMint({
  parent1Label,
  parent2Label,
  mapper,
  privateKey,
  inferenceProvider,
});

const childLabel = result.schema.ensLabel;
console.log("\n=== Child Intelligence Uploaded ===");
console.log(`label:        ${childLabel}`);
console.log(`encryptedURI: ${result.encryptedURI}`);
console.log(`metadataHash: ${result.metadataHash}`);

const childTaken = (await nft.isLabelTaken(childLabel)) as boolean;
if (childTaken) {
  throw new Error(
    `Child label "${childLabel}" already taken on-chain. Re-run to regenerate.`,
  );
}

console.log(`\nMinting child "${childLabel}" via breed()...`);
const tx = await nft.breed(
  parent1TokenId,
  parent2TokenId,
  recipient,
  [result.encryptedURI],
  ["intelligence"],
  childLabel,
);
console.log(`  tx: ${tx.hash}`);

const receipt = await tx.wait();
if (!receipt || receipt.status !== 1) {
  throw new Error(`breed() reverted for ${childLabel} (tx ${tx.hash})`);
}

let childTokenId: bigint | null = null;
let generation: bigint | null = null;
let holder: string | null = null;

for (const log of receipt.logs as Log[]) {
  if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue;
  try {
    const parsed = nft.interface.parseLog({
      topics: [...log.topics],
      data: log.data,
    });
    if (parsed?.name === "Bred") {
      childTokenId = parsed.args.childTokenId as bigint;
      generation = parsed.args.generation as bigint;
    } else if (parsed?.name === "SubnameIssued") {
      holder = parsed.args.holder as string;
    }
  } catch {
    // Non-decodable logs (events outside our ABI) are expected; skip them.
  }
}

if (childTokenId === null) {
  throw new Error(`Bred event not emitted for ${childLabel}`);
}

console.log(`\n=== Bred ===`);
console.log(`tokenId:    ${childTokenId}`);
console.log(`generation: ${generation}`);
console.log(`holder:     ${holder ?? recipient}`);
console.log(
  `parents:    #${parent1TokenId} (${parent1Label}) + #${parent2TokenId} (${parent2Label})`,
);

const updatedMapper: DeployedAgentEntry[] = [
  ...mapper,
  {
    label: childLabel,
    encryptedURI: result.encryptedURI,
    metadataHash: result.metadataHash,
  },
];
await fs.writeFile(deployedPath, JSON.stringify(updatedMapper, null, 2) + "\n");
console.log(`\nAppended child to ${deployedPath}`);

console.log("\nschema:");
console.dir(result.schema, { depth: null, colors: true });
