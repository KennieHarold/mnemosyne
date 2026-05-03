import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Address } from "viem";
import { config } from "dotenv";

config();

const agentNFT = process.env.MNEMO_NFT_ADDRESS as Address | undefined;
if (!agentNFT) {
  throw new Error("MNEMO_NFT_ADDRESS env variable is required");
}

const treasury = process.env.TREASURY_ADDRESS as Address | undefined;
if (!treasury) {
  throw new Error("TREASURY_ADDRESS env variable is required");
}

export default buildModule("MnemoLineageSplitterModule", (m) => {
  const agentNFTAddress = m.getParameter<Address>("agentNFT", agentNFT);
  const treasuryAddress = m.getParameter<Address>("treasury", treasury);

  const mnemoLineageSplitter = m.contract("MnemoLineageSplitter", [
    agentNFTAddress,
    treasuryAddress,
  ]);

  return { mnemoLineageSplitter };
});
