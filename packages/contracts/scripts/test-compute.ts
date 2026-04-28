import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { config } from "dotenv";
import { ethers, Wallet } from "ethers";
import OpenAI from "openai";
import { downloadIntelligence } from "./utils/download.ts";

config();

const rootHash = process.argv[2];
const userMessage = process.argv[3];
if (!rootHash || !userMessage) {
  throw new Error('Usage: tsx test-compute.ts <rootHash> "<userMessage>"');
}

const rpcUrl = "https://evmrpc-testnet.0g.ai";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = new Wallet(process.env.ZG_TESTNET_PRIVATE_KEY!, provider);
const broker = await createZGComputeNetworkBroker(signer as any);

const inferenceProvider = process.env.ZG_INFERENCE_PROVIDER;
if (!inferenceProvider) {
  throw new Error("ZG_INFERENCE_PROVIDER must be set to a provider address");
}

await broker.inference.acknowledgeProviderSigner(inferenceProvider);

const { intelligence } = await downloadIntelligence(rootHash);

console.log(intelligence);

const { endpoint, model } =
  await broker.inference.getServiceMetadata(inferenceProvider);
const headers = await broker.inference.getRequestHeaders(
  inferenceProvider,
  userMessage,
);

const openai = new OpenAI({
  baseURL: endpoint,
  apiKey: "",
  defaultHeaders: headers as any,
});

const completion = await openai.chat.completions.create({
  model,
  messages: [
    { role: "system", content: intelligence.systemPrompt },
    { role: "user", content: userMessage },
  ],
  stream: true,
});

for await (const chunk of completion) {
  const delta = chunk.choices[0]?.delta?.content || "";
  process.stdout.write(delta);
}
process.stdout.write("\n");
