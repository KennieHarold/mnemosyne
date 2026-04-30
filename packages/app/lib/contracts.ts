import type { Address } from "viem";
import { zeroGGalileoTestnet } from "./wagmi";

export const mnemoAgentNftAddress: Address =
  "0x3b865B6484B283536cE1FBE11e6A81F82BE335A5";

export const mnemoAgentNftChainId = zeroGGalileoTestnet.id;

export const mnemoAgentNftAbi = [
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "labelForTokenId",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "textForLabel",
    stateMutability: "view",
    inputs: [
      { name: "label", type: "string" },
      { name: "key", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
