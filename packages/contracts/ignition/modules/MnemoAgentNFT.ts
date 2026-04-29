import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import VerifierModule from "./Verifier.js";

export default buildModule("MnemoAgentNFTModule", (m) => {
  const owner = m.getAccount(0);

  const chainURL = m.getParameter<string>(
    "chainURL",
    "https://evmrpc-testnet.0g.ai",
  );
  const indexerURL = m.getParameter<string>(
    "indexerURL",
    "https://indexer-storage-testnet-turbo.0g.ai",
  );

  const { verifier } = m.useModule(VerifierModule);

  const implementation = m.contract("MnemoAgentNFT", []);

  const beacon = m.contract("UpgradeableBeacon", [implementation, owner]);

  const initData = m.encodeFunctionCall(implementation, "initialize", [
    "Mnemosyne Agents",
    "MNEMO",
    verifier,
    chainURL,
    indexerURL,
  ]);

  const proxy = m.contract("BeaconProxy", [beacon, initData]);

  const mnemoAgentNFT = m.contractAt("MnemoAgentNFT", proxy, {
    id: "MnemoAgentNFTProxied",
  });

  return { verifier, implementation, beacon, proxy, mnemoAgentNFT };
});
