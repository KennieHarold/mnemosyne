import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Address } from "viem";
import { config } from "dotenv";

config();

const gatewaySigner = process.env.GATEWAY_SIGNER_ADDRESS as Address | undefined;
if (!gatewaySigner) {
  throw new Error("GATEWAY_SIGNER_ADDRESS env variable is required");
}

export default buildModule("OffchainResolverModule", (m) => {
  const url = m.getParameter<string>(
    "url",
    "https://ens-0g-gateway.kennie-harold.workers.dev/{sender}/{data}.json",
  );
  const signers = m.getParameter<Address[]>("signers", [gatewaySigner]);

  const offchainResolver = m.contract("OffchainResolver", [url, signers]);

  return { offchainResolver };
});
