import "server-only";
import * as crypto from "crypto";
import { ethers, Wallet } from "ethers";
import OpenAI from "openai";
import { Indexer } from "@0gfoundation/0g-ts-sdk";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { createPublicClient, http, type Hex } from "viem";
import {
  mnemoAgentNftAbi,
  mnemoAgentNftAddress,
} from "./contracts";
import { zeroGGalileoTestnet } from "./wagmi";

const RPC_URL = "https://evmrpc-testnet.0g.ai";
const INDEXER_URL = "https://indexer-storage-testnet-turbo.0g.ai";

export type InferenceStatus =
  | "resolving agent"
  | "connecting to 0g broker"
  | "acknowledging provider"
  | "downloading intelligence"
  | "fetching service metadata"
  | "signing request"
  | "thinking";

export type RunInferenceArgs = {
  label: string;
  userMessage: string;
  onStatus: (status: InferenceStatus) => void;
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
};

type AgentIntelligence = {
  systemPrompt: string;
};

const publicClient = createPublicClient({
  chain: zeroGGalileoTestnet,
  transport: http(),
});

export async function runInference({
  label,
  userMessage,
  onStatus,
  onDelta,
  signal,
}: RunInferenceArgs): Promise<void> {
  requireEnv("ZG_TESTNET_PRIVATE_KEY");
  requireEnv("AGENT_ENCRYPTION_KEY");
  const inferenceProvider = requireEnv("ZG_INFERENCE_PROVIDER");

  onStatus("resolving agent");
  const encryptedURI = await resolveEncryptedURI(label);

  onStatus("connecting to 0g broker");
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new Wallet(process.env.ZG_TESTNET_PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(
    signer as unknown as Parameters<typeof createZGComputeNetworkBroker>[0],
  );

  onStatus("acknowledging provider");
  await broker.inference.acknowledgeProviderSigner(inferenceProvider);

  onStatus("downloading intelligence");
  const intelligence = await downloadIntelligence(encryptedURI);

  onStatus("fetching service metadata");
  const { endpoint, model } =
    await broker.inference.getServiceMetadata(inferenceProvider);

  onStatus("signing request");
  const headers = await broker.inference.getRequestHeaders(
    inferenceProvider,
    userMessage,
  );

  onStatus("thinking");
  const openai = new OpenAI({
    baseURL: endpoint,
    apiKey: "",
    defaultHeaders: headers as unknown as Record<string, string>,
  });

  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: intelligence.systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
    },
    { signal },
  );

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) onDelta(delta);
  }
}

async function resolveEncryptedURI(label: string): Promise<Hex> {
  const tokenId = await publicClient.readContract({
    address: mnemoAgentNftAddress,
    abi: mnemoAgentNftAbi,
    functionName: "tokenIdForLabel",
    args: [label],
  });

  const hashes = await publicClient.readContract({
    address: mnemoAgentNftAddress,
    abi: mnemoAgentNftAbi,
    functionName: "dataHashesOf",
    args: [tokenId],
  });

  const first = hashes[0];
  if (!first) {
    throw new Error(`agent ${label} has no data hashes on chain`);
  }
  return first;
}

async function downloadIntelligence(
  rootHash: string,
): Promise<AgentIntelligence> {
  const indexer = new Indexer(INDEXER_URL);
  const [downloaded, dlErr] = await indexer.downloadToBlob(rootHash);
  if (dlErr) {
    throw new Error(`download failed: ${dlErr}`);
  }

  const blob = Buffer.from(await downloaded.arrayBuffer());
  const encryptionKey = Buffer.from(process.env.AGENT_ENCRYPTION_KEY!, "hex");
  if (encryptionKey.length !== 32) {
    throw new Error("AGENT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }

  const iv = blob.subarray(0, 12);
  const authTag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as AgentIntelligence;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}
