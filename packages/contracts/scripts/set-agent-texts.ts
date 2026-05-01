import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { network } from "hardhat";
import { type Address } from "viem";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentsPath = path.resolve(__dirname, "agents.json");

const rawAddress = process.env.MNEMO_NFT_ADDRESS;
if (!rawAddress) {
  throw new Error("MNEMO_NFT_ADDRESS must be set in .env");
}
const contractAddress = rawAddress as Address;

const { viem } = await network.getOrCreate();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const nft = await viem.getContractAt("MnemoAgentNFT", contractAddress);

interface Agent {
  displayName: string;
  ensLabel: string;
  tagline: string;
}

const raw = await fs.readFile(agentsPath, "utf8");
const { agents } = JSON.parse(raw) as { agents: Agent[] };

if (!Array.isArray(agents) || agents.length === 0) {
  throw new Error("No agents found in agents.json");
}

console.log(`Updating text records for ${agents.length} agent(s)`);
console.log(`  contract: ${contractAddress}`);
console.log(`  signer:   ${walletClient.account.address}`);

const keys = ["generation", "tagline"] as const;

for (const agent of agents) {
  console.log(`\n${agent.ensLabel}`);

  const taken = await nft.read.isLabelTaken([agent.ensLabel]);
  if (!taken) {
    console.log(`  not minted, skipping`);
    continue;
  }

  const tokenId = await nft.read.tokenIdForLabel([agent.ensLabel]);
  const values = ["0", agent.tagline];

  const txHash = await nft.write.setTexts([tokenId, [...keys], values]);
  console.log(`  token #${tokenId} tx: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    checkReplacement: false,
    pollingInterval: 2_000,
    retryCount: 20,
    timeout: 300_000,
  });
  if (receipt.status !== "success") {
    throw new Error(`setTexts reverted for ${agent.ensLabel} (tx ${txHash})`);
  }

  console.log(`  updated generation="0" tagline="${agent.tagline}"`);
}

console.log("\nAll text records updated.");
