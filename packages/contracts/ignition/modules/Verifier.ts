import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { zeroAddress } from "viem";

export const VerifierType = {
  TEE: 0,
  ZKP: 1,
} as const;

export default buildModule("VerifierModule", (m) => {
  const attestationContract = m.getParameter<`0x${string}`>(
    "attestationContract",
    zeroAddress,
  );
  const verifierType = m.getParameter<number>(
    "verifierType",
    VerifierType.TEE,
  );

  const verifier = m.contract("Verifier", [attestationContract, verifierType]);

  return { verifier };
});
