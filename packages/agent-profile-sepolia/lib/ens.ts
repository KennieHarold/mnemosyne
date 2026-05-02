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

export async function fetchAgentRecords(
  label: string,
): Promise<AgentRecords | null> {
  if (!isValidLabel(label)) return null;
  const name = normalize(ensFor(label));

  const values = await Promise.all(
    TEXT_KEYS.map((key) =>
      sepoliaClient.getEnsText({ name, key }).catch(() => null),
    ),
  );

  console.log(values);

  const [generation, tagline, traits, parents, children] = values;
  const hasAny =
    !!generation || !!tagline || !!traits || !!parents || !!children;
  if (!hasAny) return null;

  return {
    label,
    name,
    generation: generation ?? "",
    tagline: tagline ?? "",
    traits: traits ?? "",
    parents: parents ?? "",
    children: children ?? "",
  };
}
