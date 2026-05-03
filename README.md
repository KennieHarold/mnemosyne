# Mnemosyne

> Memory bound across generations. AI agents you mint, own, breed, and pass royalties up the lineage.

Mnemosyne is a protocol for AI agents that live on-chain as **ERC-7857 intelligent NFTs (iNFTs)**. Each agent's "intelligence" — system prompt, traits, skills, memory — is encrypted client-side, uploaded to **0G Storage**, and addressed by its data hash on the NFT. Inference runs through the **0G Compute Network** broker against the decrypted intelligence inside the server. Two agents can be **bred** into a child whose persona is synthesized by an LLM and whose genealogy is recorded on-chain; every paid invocation distributes royalties up to parents and grandparents. Each agent gets an **ENS subname** under `mnemo.eth`, resolved via a CCIP-Read gateway.

## Architecture

```
                     ┌──────────────────────┐
   browser  ◀──────▶ │  packages/app        │   Next.js 16 (App Router)
                     │   - mint / breed /   │
                     │     chat / tree UI   │
                     │   - wagmi + viem     │
                     └──────┬───────────────┘
                            │  Server Actions / API routes
                            ▼
   ┌──────────────────────────────────────────────────┐
   │           Server (Next.js, server-only)          │
   │                                                  │
   │   inference.ts  ──▶ 0G Compute broker (OpenAI)   │
   │   breed.ts      ──▶ merge two parents via LLM    │
   │   intelligence  ──▶ AES-256-GCM encrypt          │
   │                     + 0G Storage upload          │
   └──────┬──────────────────────────────────┬────────┘
          │                                  │
          ▼                                  ▼
   ┌──────────────────────┐         ┌──────────────────────┐
   │  0G Galileo Testnet  │         │     0G Storage       │
   │                      │         │   (encrypted blobs)  │
   │  MnemoAgentNFT       │         └──────────────────────┘
   │  MnemoLineageSplitter│
   │  Verifier            │
   └──────────┬───────────┘
              │ text records (subname → addr/text)
              │
   ┌──────────▼───────────┐         ┌──────────────────────┐
   │  packages/gateway    │ ◀─────▶ │   OffchainResolver   │
   │  (CCIP-Read worker)  │  CCIP   │   on Sepolia (ENS)   │
   └──────────────────────┘         └──────────┬───────────┘
                                               │
                                    ┌──────────▼───────────┐
                                    │ packages/            │
                                    │   agent-profile-     │
                                    │   sepolia            │
                                    │   (ENS profile UI)   │
                                    └──────────────────────┘
```

## Packages

This is a `pnpm` workspace. All packages live under [packages/](packages/).

| Package | Path | Purpose |
| --- | --- | --- |
| `@mnemosyne/contracts` | [packages/contracts](packages/contracts) | Solidity contracts (Hardhat 3 + Ignition): the iNFT, lineage splitter, verifier, ENS offchain resolver. |
| `@mnemosyne/app` | [packages/app](packages/app) | Next.js 16 frontend + server: mint / breed / chat / lineage tree, plus 0G Storage and 0G Compute integrations. |
| `agent-profile-sepolia` | [packages/agent-profile-sepolia](packages/agent-profile-sepolia) | Next.js 16 ENS profile viewer that resolves `<label>.mnemo.eth` over Sepolia + CCIP-Read. |
| `@mnemosyne/gateway` | [packages/gateway](packages/gateway) | Cloudflare Worker that backs the ENS `OffchainResolver`: reads text/addr records off the 0G NFT and signs the response. |

### `@mnemosyne/contracts`

Solidity 0.8.28, Hardhat 3, Ignition deployments, OpenZeppelin upgradeable. Layout:

- [contracts/AgentNFT.sol](packages/contracts/contracts/AgentNFT.sol) — ERC-7857 reference implementation (upgradeable, ERC-7201 storage). Pluggable [`IERC7857DataVerifier`](packages/contracts/contracts/interfaces/IERC7857DataVerifier.sol) for TEE/ZKP proofs.
- [contracts/MnemoAgentNFT.sol](packages/contracts/contracts/MnemoAgentNFT.sol) — extends `AgentNFT` with:
  - Subname registry (`mintWithSubname`, `setText`, `addressForLabel`).
  - On-chain lineage (`breed(parent1, parent2, …)` records `Lineage{parent1, parent2, generation, breeder, birthBlock}` and emits `Bred`).
  - Auto-syncs `parents` / `children` / `generation` text records on the ENS subname.
  - ENS-normalized labels (a–z, 0–9, hyphens not at edges, ≤63 chars).
- [contracts/MnemoLineageSplitter.sol](packages/contracts/contracts/MnemoLineageSplitter.sol) — `payInvocation(tokenId)` splits the fee:
  - **50%** to the invoked agent's owner
  - **30%** split across parents (gen-1)
  - **15%** split across grandparents (gen-2)
  - **5%** to treasury, plus any orphan/dust leftovers
  - Recipients pull funds via `claim()` (pull-payment, `ReentrancyGuard`).
- [contracts/Verifier.sol](packages/contracts/contracts/Verifier.sol) — `BaseVerifier` + `Verifier` implementing `verifyPreimage` and `verifyTransferValidity`. Supports two modes: `TEE` and `ZKP` (selected at deploy).
- [contracts/proxy/](packages/contracts/contracts/proxy) — `UpgradeableBeacon` + `BeaconProxy` (`MnemoAgentNFT` is deployed behind a beacon).
- [contracts/resolver/OffchainResolver.sol](packages/contracts/contracts/resolver/OffchainResolver.sol) — ENSIP-10 / EIP-3668 offchain resolver (deployed on Sepolia). Defers all reads to the CCIP-Read gateway and verifies the signed response against an allow-listed signer set.

Ignition modules wire all of this up:

- [ignition/modules/MnemoAgentNFT.ts](packages/contracts/ignition/modules/MnemoAgentNFT.ts) — deploys `Verifier` → implementation → `UpgradeableBeacon` → `BeaconProxy(initialize(...))`.
- [ignition/modules/MnemoLineageSplitter.ts](packages/contracts/ignition/modules/MnemoLineageSplitter.ts) — wires the splitter to a deployed `MNEMO_NFT_ADDRESS` and `TREASURY_ADDRESS`.
- [ignition/modules/OffchainResolver.ts](packages/contracts/ignition/modules/OffchainResolver.ts) — deploys the Sepolia resolver pointing at the gateway URL, with `GATEWAY_SIGNER_ADDRESS` allow-listed.

Networks ([hardhat.config.ts](packages/contracts/hardhat.config.ts)): `sepolia`, `zgTestnet` (chainId 16602), plus simulated `hardhatMainnet` / `hardhatOp`. Foundry-style Solidity tests + `node:test` TS tests live in [test/](packages/contracts/test).

### `@mnemosyne/app`

Next.js 16 (App Router), React 19, styled-components, wagmi + viem, ethers (for 0G SDK compatibility), `@xyflow/react` for the lineage tree.

Routes ([app/(public)](packages/app/app/(public))):

- `/` — landing page with live mint count
- `/mint` — mints a Genesis (Gen-0) agent: collect persona → encrypt + upload to 0G Storage → call `mintWithSubname(...)`
- `/breed` — pick two parents → server streams an LLM-merged child intelligence → user submits `breed(...)` to mint the child on-chain
- `/tree` — interactive lineage graph
- `/directory` — list of all minted agents
- `/chat/[label]` — chat with a specific agent

API routes ([app/api](packages/app/app/api)) emit **NDJSON streams** (one JSON event per line) so the UI can render progressive status:

- [api/chat/[label]/route.ts](packages/app/app/api/chat/[label]/route.ts) → [server/inference.ts](packages/app/server/inference.ts) — resolves token ID + encrypted URI, downloads the encrypted intelligence from 0G Storage, decrypts with `AGENT_ENCRYPTION_KEY`, opens a streaming `chat.completions` against the 0G Compute broker, and (fire-and-forget) calls `MnemoLineageSplitter.payInvocation(tokenId)` from an escrow wallet.
- [api/breed/route.ts](packages/app/app/api/breed/route.ts) → [server/breed.ts](packages/app/server/breed.ts) — fetches both parents, decrypts both intelligences, runs three LLM passes (merge → name → rewrite system prompt with name), encrypts the result, uploads to 0G Storage, and returns `{encryptedURI, metadataHash, schema}` for the user to mint.
- [api/mint/upload/route.ts](packages/app/app/api/mint/upload/route.ts) → [server/mint.ts](packages/app/server/mint.ts) — encrypts a Genesis schema and uploads it to 0G Storage.

Storage shape — every agent's intelligence is a JSON blob ([breed-events.ts](packages/app/lib/breed-events.ts)):

```ts
{
  displayName, ensLabel, tagline, systemPrompt,
  traits: string[],
  skills: string[],
  memory: {
    facts: string[],
    recent_episodes: unknown[],
    themes: string[],
    generation_meta: { born_at, interaction_count }
  }
}
```

It is encrypted with **AES-256-GCM** (`iv | authTag | ciphertext`) and uploaded via [`@0gfoundation/0g-ts-sdk`](https://www.npmjs.com/package/@0gfoundation/0g-ts-sdk) (`Indexer.upload` + `ZgFile.merkleTree`). The Merkle root hash is what gets stored as `dataHashes[0]` on the NFT.

### `agent-profile-sepolia`

A standalone profile viewer for ENS subnames under `mnemo.eth`. The user types `augustus` and the page fetches `addr` + the text records (`generation`, `tagline`, `traits`, `parents`, `children`) directly from Sepolia using `viem`'s ENS helpers. Because the Sepolia `OffchainResolver` is wired to `OffchainLookup`, those reads transparently round-trip through the CCIP-Read gateway and ultimately read state off the 0G NFT.

Note: this package's [AGENTS.md](packages/agent-profile-sepolia/AGENTS.md) flags that it pins a pre-release Next.js 16 with breaking API changes — consult `node_modules/next/dist/docs/` rather than relying on training data when editing.

### `@mnemosyne/gateway`

Cloudflare Worker built with `@ensdomains/ccip-read-router` and `viem`. It implements the gateway side of EIP-3668:

1. Receives the CCIP-Read call from the Sepolia `OffchainResolver`.
2. DNS-decodes the ENS name to extract the leftmost label.
3. Reads `addressForLabel(label)` / `textForLabel(label, key)` off the `MnemoAgentNFT` on **0G Galileo testnet**.
4. Signs the `(sender, request, result, expires)` tuple with `GATEWAY_SIGNER_PRIVATE_KEY` (5-minute expiry) and returns it.
5. The L1 resolver verifies the signature against its allow-listed signers ([SignatureVerifier.sol](packages/contracts/contracts/resolver/SignatureVerifier.sol)).

Deployment is `wrangler deploy` from [packages/gateway](packages/gateway). Configuration is in [wrangler.toml](packages/gateway/wrangler.toml); the secret signer key is set via `wrangler secret put GATEWAY_SIGNER_PRIVATE_KEY`.

## Royalty model

The lineage splitter is the economic core — it is what makes a child's existence valuable to its parents:

```
invocation fee  ──▶  MnemoLineageSplitter.payInvocation(tokenId)
                          │
                          ├─ 50.00%  →  ownerOf(tokenId)
                          ├─ 30.00%  →  split across parents (ownerOf each)
                          ├─ 15.00%  →  split across 4 grandparents (ownerOf each)
                          └─  5.00%  →  treasury  (+ any orphan/dust dust)
```

Funds accumulate in `claimable[recipient]` and are withdrawn via `claim()`. Genesis (Gen-0) agents have no parents, so 100% goes to owner + treasury via the orphan sweep. Today the [server fires a `payInvocation`](packages/app/server/inference.ts) per chat from an escrow wallet at `INVOCATION_FEE = 0.001 0G`.

## Networks

- **0G Galileo Testnet** — chainId `16601` for the app's `viem` chain definition; `16602` for Hardhat (see [wagmi.ts](packages/app/lib/wagmi.ts), [hardhat.config.ts](packages/contracts/hardhat.config.ts)).
- **Ethereum Sepolia** — hosts the `OffchainResolver` and the `mnemo.eth` ENS name.
- **0G Storage** — `https://indexer-storage-testnet-turbo.0g.ai`.
- **0G Compute Network** — broker created via `@0glabs/0g-serving-broker`, talks to the inference provider set by `ZG_INFERENCE_PROVIDER`.

## Getting started

Requires Node 20+ and `pnpm@10.33.0` (pinned in [package.json](package.json)).

```bash
pnpm install
```

Each package is run independently:

```bash
# frontend
pnpm --filter @mnemosyne/app dev

# ENS profile viewer
pnpm --filter agent-profile-sepolia dev

# gateway (Cloudflare Worker, local dev)
pnpm --filter @mnemosyne/gateway exec wrangler dev

# contracts: tests
pnpm --filter @mnemosyne/contracts exec hardhat test

# contracts: deploy NFT to 0G testnet
pnpm --filter @mnemosyne/contracts exec hardhat ignition deploy \
  --network zgTestnet ignition/modules/MnemoAgentNFT.ts

# contracts: deploy splitter (needs MNEMO_NFT_ADDRESS + TREASURY_ADDRESS in .env)
pnpm --filter @mnemosyne/contracts exec hardhat ignition deploy \
  --network zgTestnet ignition/modules/MnemoLineageSplitter.ts

# contracts: deploy ENS offchain resolver to Sepolia
pnpm --filter @mnemosyne/contracts exec hardhat ignition deploy \
  --network sepolia ignition/modules/OffchainResolver.ts
```

### Environment variables

**`packages/app/.env.local`**

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_MNEMO_NFT_ADDRESS` | `MnemoAgentNFT` proxy address on 0G testnet. |
| `ZG_TESTNET_PRIVATE_KEY` | Server signer used for 0G Storage uploads + 0G Compute broker. |
| `AGENT_ENCRYPTION_KEY` | 32-byte hex (64 chars). Symmetric key for AES-256-GCM intelligence blobs. |
| `ZG_INFERENCE_PROVIDER` | Provider address registered on the 0G Compute Network. |
| `LINEAGE_SPLITTER_ADDRESS` | Deployed `MnemoLineageSplitter` (royalty fan-out). |
| `ESCROW_WALLET_PRIVATE_KEY` | Signs `payInvocation(...)` per chat (fire-and-forget). |

**`packages/contracts/.env`**

| Variable | Purpose |
| --- | --- |
| `MNEMO_NFT_ADDRESS` | Required by `MnemoLineageSplitter` Ignition module. |
| `TREASURY_ADDRESS` | Required by `MnemoLineageSplitter` Ignition module. |
| `GATEWAY_SIGNER_ADDRESS` | Allow-listed signer for `OffchainResolver` (Sepolia). |
| `ZG_RPC_URL` / `ZG_TESTNET_PRIVATE_KEY` | 0G testnet deploy. |
| `SEPOLIA_INFURA_API_URL` / `SEPOLIA_PRIVATE_KEY` | Sepolia deploy (or use `hardhat-keystore`). |
| `AGENT_ENCRYPTION_KEY`, `ZG_INFERENCE_PROVIDER` | Used by [scripts/](packages/contracts/scripts) (genesis upload, smoke tests). |

**`packages/agent-profile-sepolia/.env.local`**

| Variable | Purpose |
| --- | --- |
| `SEPOLIA_RPC` | Optional. Defaults to `https://sepolia.drpc.org`. |

**`packages/gateway`** (Cloudflare Worker secrets)

| Variable | Purpose |
| --- | --- |
| `ZERO_G_RPC` (var) | Defaults to `https://evmrpc-testnet.0g.ai`. |
| `INFT_CONTRACT` (var) | `MnemoAgentNFT` address on 0G testnet. |
| `RESOLVER_ADDRESS` (var) | `OffchainResolver` address on Sepolia (informational). |
| `GATEWAY_SIGNER_PRIVATE_KEY` (secret) | 32-byte hex. The L1 resolver allow-lists its address. |

## Notes

- The [agent-profile-sepolia/AGENTS.md](packages/agent-profile-sepolia/AGENTS.md) note about Next.js 16 breaking changes also applies to `packages/app` — both pin `next@16.2.4`.
- Genesis seed agents (Socrates, Marcus, Augustus, …) live in [packages/contracts/scripts/agents.json](packages/contracts/scripts/agents.json); [deploy-agents.ts](packages/contracts/scripts/deploy-agents.ts) + [mint-agents.ts](packages/contracts/scripts/mint-agents.ts) upload + mint them.
- ERC-7857 reference and verifier interfaces live under [packages/contracts/contracts/interfaces/](packages/contracts/contracts/interfaces).
