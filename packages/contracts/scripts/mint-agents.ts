import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { network } from "hardhat";
import { parseEventLogs, type Address, type Hex } from "viem";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deployedPath = path.resolve(__dirname, "agents-deployed.json");

const rawAddress = process.env.MNEMO_NFT_ADDRESS;
if (!rawAddress) {
  throw new Error("MNEMO_NFT_ADDRESS must be set in .env");
}
const contractAddress = rawAddress as Address;

const { viem } = await network.getOrCreate();
const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

const recipient =
  (process.env.MINT_RECIPIENT as Address | undefined) ??
  walletClient.account.address;

const nft = await viem.getContractAt("MnemoAgentNFT", contractAddress);

interface DeployedAgent {
  label: string;
  encryptedURI: Hex;
  metadataHash: Hex;
}

interface MintedAgent extends DeployedAgent {
  tokenId: string;
  holder: Address;
  txHash: Hex | null;
}

const raw = await fs.readFile(deployedPath, "utf8");
const agents = JSON.parse(raw) as DeployedAgent[];

if (!Array.isArray(agents) || agents.length === 0) {
  throw new Error("No agents found in agents-deployed.json");
}

console.log(`Minting ${agents.length} agent(s)`);
console.log(`  contract: ${contractAddress}`);
console.log(`  signer:   ${walletClient.account.address}`);
console.log(`  to:       ${recipient}`);

const minted: MintedAgent[] = [];

for (const agent of agents) {
  console.log(`\n${agent.label}`);

  const taken = await nft.read.isLabelTaken([agent.label]);
  if (taken) {
    const tokenId = await nft.read.tokenIdForLabel([agent.label]);
    const holder = (await nft.read.ownerOf([tokenId])) as Address;
    console.log(
      `  already minted as token #${tokenId} (holder ${holder}), skipping`,
    );
    minted.push({
      ...agent,
      tokenId: tokenId.toString(),
      holder,
      txHash: null,
    });
    continue;
  }

  const proofs: readonly Hex[] = [agent.encryptedURI];
  const descriptions: readonly string[] = ["intelligence"];

  const txHash = await nft.write.mintWithSubname([
    proofs,
    descriptions,
    recipient,
    agent.label,
  ]);
  console.log(`  tx: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  if (receipt.status !== "success") {
    throw new Error(`Mint reverted for ${agent.label} (tx ${txHash})`);
  }

  const events = parseEventLogs({
    abi: nft.abi,
    eventName: "SubnameIssued",
    logs: receipt.logs,
  });
  const issued = events.find(
    (e) => e.address.toLowerCase() === contractAddress.toLowerCase(),
  );
  if (!issued) {
    throw new Error(`SubnameIssued not emitted for ${agent.label}`);
  }

  const { tokenId, holder } = issued.args as {
    tokenId: bigint;
    label: string;
    holder: Address;
  };

  console.log(`  minted token #${tokenId} -> ${holder}`);
  minted.push({
    ...agent,
    tokenId: tokenId.toString(),
    holder,
    txHash,
  });
}

console.table(
  minted.map((m) => ({
    label: m.label,
    tokenId: m.tokenId,
    holder: m.holder,
    txHash: m.txHash ?? "(skipped)",
  })),
);
