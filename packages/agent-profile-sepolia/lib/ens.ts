import "server-only";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";
import { AgentRecords, TEXT_KEYS, ensFor, isValidLabel } from "./label";

const sepoliaRpc = process.env.SEPOLIA_RPC ?? "https://sepolia.drpc.org";

export const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(sepoliaRpc),
});

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function fetchAgentRecords(
  label: string,
): Promise<AgentRecords | null> {
  if (!isValidLabel(label)) return null;
  const name = normalize(ensFor(label));

  const [address, ...values] = await Promise.all([
    sepoliaClient.getEnsAddress({ name }).catch(() => null),
    ...TEXT_KEYS.map((key) =>
      sepoliaClient.getEnsText({ name, key }).catch(() => null),
    ),
  ]);

  const [generation, tagline, traits, parents, children] = values;
  const hasAnyText =
    !!generation || !!tagline || !!traits || !!parents || !!children;
  const hasAddress = !!address && address !== ZERO_ADDRESS;
  if (!hasAddress && !hasAnyText) return null;

  return {
    label,
    name,
    address: address ?? "",
    generation: generation ?? "",
    tagline: tagline ?? "",
    traits: traits ?? "",
    parents: parents ?? "",
    children: children ?? "",
  };
}
