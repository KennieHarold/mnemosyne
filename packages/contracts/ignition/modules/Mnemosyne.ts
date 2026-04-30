import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import MnemoAgentNFTModule from "./MnemoAgentNFT.js";
import OffchainResolverModule from "./OffchainResolver.js";

export default buildModule("MnemosyneModule", (m) => {
  const { verifier, implementation, beacon, proxy, mnemoAgentNFT } =
    m.useModule(MnemoAgentNFTModule);

  const { offchainResolver } = m.useModule(OffchainResolverModule);

  return {
    verifier,
    implementation,
    beacon,
    proxy,
    mnemoAgentNFT,
    offchainResolver,
  };
});
