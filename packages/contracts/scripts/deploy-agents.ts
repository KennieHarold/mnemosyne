import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { uploadIntelligence } from "./utils/upload.ts";
import { type Hex } from "viem";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentsPath = path.resolve(__dirname, "agents.json");
const deployedPath = path.resolve(__dirname, "agents-deployed.json");

const raw = await fs.readFile(agentsPath, "utf8");
const { agents } = JSON.parse(raw) as {
  agents: Array<{
    displayName: string;
    ensLabel: string;
    [key: string]: unknown;
  }>;
};

if (!Array.isArray(agents) || agents.length === 0) {
  throw new Error("No agents found in agents.json");
}

const deployed: Array<{
  label: string;
  encryptedURI: Hex;
  metadataHash: Hex;
}> = [];

for (const agent of agents) {
  console.log(`\nUploading ${agent.displayName} (${agent.ensLabel})...`);

  const intelligence = {
    ...agent,
    memory: {
      ...(agent.memory as object),
      generation_meta: {
        ...((agent.memory as any)?.generation_meta ?? {}),
        born_at: Math.floor(Date.now() / 1000),
        interaction_count: 0,
      },
    },
  };

  const { encryptedURI, metadataHash } = await uploadIntelligence(
    JSON.stringify(intelligence),
  );

  deployed.push({
    label: agent.ensLabel,
    encryptedURI,
    metadataHash,
  });
}

await fs.writeFile(deployedPath, JSON.stringify(deployed, null, 2) + "\n");

console.log(`\nAll agents deployed. Wrote metadata to ${deployedPath}`);
console.table(deployed);
