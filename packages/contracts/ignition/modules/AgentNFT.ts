import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import VerifierModule from "./Verifier.js";

export default buildModule("AgentNFTModule", (m) => {
  const owner = m.getAccount(0);

  const name = m.getParameter<string>("name", "Mnemosyne Agents");
  const symbol = m.getParameter<string>("symbol", "MNEMO");
  const chainURL = m.getParameter<string>(
    "chainURL",
    "https://evmrpc-testnet.0g.ai",
  );
  const indexerURL = m.getParameter<string>(
    "indexerURL",
    "https://indexer-storage-testnet-turbo.0g.ai",
  );

  const { verifier } = m.useModule(VerifierModule);

  const implementation = m.contract("AgentNFT", []);

  const beacon = m.contract("UpgradeableBeacon", [implementation, owner]);

  const initData = m.encodeFunctionCall(implementation, "initialize", [
    name,
    symbol,
    verifier,
    chainURL,
    indexerURL,
  ]);

  const proxy = m.contract("BeaconProxy", [beacon, initData]);

  const agentNFT = m.contractAt("AgentNFT", proxy, {
    id: "AgentNFTProxied",
  });

  return { verifier, implementation, beacon, proxy, agentNFT };
});
