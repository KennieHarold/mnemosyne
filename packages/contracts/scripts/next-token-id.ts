import { config } from "dotenv";
import { network } from "hardhat";
import type { Address } from "viem";

config();

const rawAddress = process.env.MNEMO_NFT_ADDRESS;
if (!rawAddress) {
  throw new Error("MNEMO_NFT_ADDRESS must be set in .env");
}
const contractAddress = rawAddress as Address;

const { viem } = await network.getOrCreate();
const nft = await viem.getContractAt("MnemoAgentNFT", contractAddress);

const nextTokenId = await nft.read.nextTokenId();

console.log(`contract:    ${contractAddress}`);
console.log(`nextTokenId: ${nextTokenId}`);
