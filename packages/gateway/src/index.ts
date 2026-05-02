import { CcipReadRouter } from "@ensdomains/ccip-read-router";
import {
  createPublicClient,
  http,
  encodeAbiParameters,
  keccak256,
  encodePacked,
  getAddress,
  hexToBytes,
  type Address,
  type Hex,
} from "viem";
import { sign } from "viem/accounts";

interface Secret {
  ZERO_G_RPC: string;
  INFT_CONTRACT: Address;
  GATEWAY_SIGNER_PRIVATE_KEY: Hex;
}

const iNFTAbi = [
  {
    name: "addressForLabel",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "textForLabel",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "label", type: "string" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
] as const;

function dnsDecode(dnsEncoded: Hex): string {
  const bytes = hexToBytes(dnsEncoded);
  const labels: string[] = [];
  let i = 0;
  while (i < bytes.length && bytes[i] !== 0) {
    const len = bytes[i]!;
    labels.push(new TextDecoder().decode(bytes.slice(i + 1, i + 1 + len)));
    i += 1 + len;
  }
  return labels.join(".");
}

function leftmostLabel(name: string): string {
  return name.split(".")[0]!;
}

function normalizePrivateKey(raw: string): Hex {
  const trimmed = raw.trim();
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error(
      "GATEWAY_SIGNER_PRIVATE_KEY must be a 32-byte hex string (with or without 0x prefix)",
    );
  }
  return withPrefix as Hex;
}

async function signResponse(
  sender: Address,
  request: Hex,
  result: Hex,
  privateKey: Hex,
): Promise<{ data: Hex }> {
  const expires = BigInt(Math.floor(Date.now() / 1000) + 300);

  const messageHash = keccak256(
    encodePacked(
      ["bytes2", "address", "uint64", "bytes32", "bytes32"],
      [
        "0x1900",
        getAddress(sender),
        expires,
        keccak256(request),
        keccak256(result),
      ],
    ),
  );

  const signature = await sign({
    hash: messageHash,
    privateKey,
    to: "hex",
  });

  const data = encodeAbiParameters(
    [{ type: "bytes" }, { type: "uint64" }, { type: "bytes" }],
    [result, expires, signature],
  );

  return { data };
}

function buildRouter(env: Secret) {
  const router = CcipReadRouter();
  const zeroG = createPublicClient({ transport: http(env.ZERO_G_RPC) });
  let currentLabel = "";

  router.add({
    type: "function resolve(bytes name, bytes data) returns (bytes)",
    handle: async ([dnsName, innerData], req) => {
      currentLabel = leftmostLabel(dnsDecode(dnsName));
      const inner = await router.call({ to: req.to, data: innerData });
      if (inner.status !== 200) {
        throw new Error(`Inner dispatch failed: ${JSON.stringify(inner.body)}`);
      }
      return encodeAbiParameters(
        [{ type: "bytes" }],
        [(inner.body as { data: Hex }).data],
      );
    },
  });

  router.add({
    type: "function addr(bytes32 node) returns (address)",
    handle: async () => {
      const address = await zeroG.readContract({
        address: env.INFT_CONTRACT,
        abi: iNFTAbi,
        functionName: "addressForLabel",
        args: [currentLabel],
      });
      return encodeAbiParameters([{ type: "address" }], [address]);
    },
  });

  router.add({
    type: "function addr(bytes32 node, uint256 coinType) returns (bytes)",
    handle: async ([, coinType]) => {
      // coinType 60 = ETH; for other chains return empty
      const addressBytes: Hex =
        coinType === 60n
          ? ((await zeroG.readContract({
              address: env.INFT_CONTRACT,
              abi: iNFTAbi,
              functionName: "addressForLabel",
              args: [currentLabel],
            })) as Hex)
          : "0x";
      return encodeAbiParameters([{ type: "bytes" }], [addressBytes]);
    },
  });

  router.add({
    type: "function text(bytes32 node, string key) returns (string)",
    handle: async ([, key]) => {
      const value = await zeroG.readContract({
        address: env.INFT_CONTRACT,
        abi: iNFTAbi,
        functionName: "textForLabel",
        args: [currentLabel, key],
      });
      return encodeAbiParameters([{ type: "string" }], [value]);
    },
  });

  return router;
}

async function parseRequest(
  request: Request,
): Promise<{ sender: Address; data: Hex }> {
  if (request.method === "GET") {
    // EIP-3668 GET form: /<sender>/<data>.json
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    if (parts.length < 2) {
      throw new Error(`Invalid GET path: ${url.pathname}`);
    }
    const sender = parts[0] as Address;
    const data = parts[1]!.replace(/\.json$/, "") as Hex;
    return { sender, data };
  }
  return (await request.json()) as { sender: Address; data: Hex };
}

export default {
  async fetch(request: Request, env: Secret): Promise<Response> {
    try {
      const router = buildRouter(env);

      const { sender, data } = await parseRequest(request);

      const callResult = await router.call({ to: sender, data });
      if (callResult.status !== 200) {
        return Response.json(callResult.body, { status: callResult.status });
      }
      const result = (callResult.body as { data: Hex }).data;

      // Sign the (request, result) pair so the L1 resolver trusts it
      const signed = await signResponse(
        sender,
        data,
        result,
        normalizePrivateKey(env.GATEWAY_SIGNER_PRIVATE_KEY),
      );

      return Response.json(signed, {
        headers: { "Cache-Control": "max-age=60" },
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ message: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
