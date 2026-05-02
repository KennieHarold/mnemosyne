import type { Address } from "viem";
import { zeroGGalileoTestnet } from "./wagmi";

export const mnemoAgentNftAddress = process.env
  .NEXT_PUBLIC_MNEMO_NFT_ADDRESS as Address;

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
  {
    type: "function",
    name: "tokenIdForLabel",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "dataHashesOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    type: "function",
    name: "isLabelTaken",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isLabelReserved",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "mintWithSubname",
    stateMutability: "payable",
    inputs: [
      { name: "proofs", type: "bytes[]" },
      { name: "dataDescriptions", type: "string[]" },
      { name: "to", type: "address" },
      { name: "label", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setTexts",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "keys", type: "string[]" },
      { name: "values", type: "string[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "breed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "parent1Id", type: "uint256" },
      { name: "parent2Id", type: "uint256" },
      { name: "to", type: "address" },
      { name: "proofs", type: "bytes[]" },
      { name: "dataDescriptions", type: "string[]" },
      { name: "label", type: "string" },
    ],
    outputs: [{ name: "childTokenId", type: "uint256" }],
  },
  {
    type: "event",
    name: "Bred",
    inputs: [
      { name: "childTokenId", type: "uint256", indexed: true },
      { name: "parent1", type: "uint256", indexed: true },
      { name: "parent2", type: "uint256", indexed: true },
      { name: "breeder", type: "address", indexed: false },
      { name: "generation", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SubnameIssued",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "label", type: "string", indexed: false },
      { name: "holder", type: "address", indexed: true },
    ],
    anonymous: false,
  },
] as const;
