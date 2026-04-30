"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import {
  mnemoAgentNftAbi,
  mnemoAgentNftAddress,
  mnemoAgentNftChainId,
} from "@/lib/contracts";
import { glyphForLabel, nameFromLabel, type Agent } from "@/lib/agent";

const STALE_TIME = 60_000;
const GC_TIME = 5 * 60_000;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const TEXT_KEYS = ["tagline", "generation"] as const;
type TextKey = (typeof TEXT_KEYS)[number];

type UseAgentsResult = {
  agents: Agent[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
};

export function useAgents(): UseAgentsResult {
  const next = useReadContract({
    address: mnemoAgentNftAddress,
    abi: mnemoAgentNftAbi,
    functionName: "nextTokenId",
    chainId: mnemoAgentNftChainId,
    query: {
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
    },
  });

  const totalMinted = next.data ? Number(next.data) : 0;

  const baseCalls = useMemo(
    () =>
      Array.from({ length: totalMinted }, (_, i) => [
        {
          address: mnemoAgentNftAddress,
          abi: mnemoAgentNftAbi,
          functionName: "ownerOf" as const,
          args: [BigInt(i)] as const,
          chainId: mnemoAgentNftChainId,
        },
        {
          address: mnemoAgentNftAddress,
          abi: mnemoAgentNftAbi,
          functionName: "labelForTokenId" as const,
          args: [BigInt(i)] as const,
          chainId: mnemoAgentNftChainId,
        },
      ]).flat(),
    [totalMinted],
  );

  const baseReads = useReadContracts({
    contracts: baseCalls,
    allowFailure: true,
    query: {
      enabled: totalMinted > 0,
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
    },
  });

  const labels = useMemo<string[]>(() => {
    if (!baseReads.data) return [];
    const out: string[] = [];
    for (let i = 0; i < totalMinted; i++) {
      const labelResult = baseReads.data[i * 2 + 1];
      const label =
        labelResult?.status === "success" && typeof labelResult.result === "string"
          ? labelResult.result
          : "";
      out.push(label);
    }
    return out;
  }, [baseReads.data, totalMinted]);

  const textCalls = useMemo(
    () =>
      labels.flatMap((label) =>
        label
          ? TEXT_KEYS.map((key) => ({
              address: mnemoAgentNftAddress,
              abi: mnemoAgentNftAbi,
              functionName: "textForLabel" as const,
              args: [label, key] as const,
              chainId: mnemoAgentNftChainId,
            }))
          : [],
      ),
    [labels],
  );

  const textReads = useReadContracts({
    contracts: textCalls,
    allowFailure: true,
    query: {
      enabled: textCalls.length > 0,
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
    },
  });

  const baseData = baseReads.data;
  const textData = textReads.data;

  const agents = useMemo<Agent[]>(() => {
    if (totalMinted === 0) return [];
    if (!baseData) return [];

    const textByLabel = new Map<string, Record<TextKey, string>>();
    if (textData) {
      let cursor = 0;
      for (const label of labels) {
        if (!label) continue;
        const values = {} as Record<TextKey, string>;
        TEXT_KEYS.forEach((key, idx) => {
          const res = textData[cursor + idx];
          values[key] =
            res?.status === "success" && typeof res.result === "string"
              ? res.result
              : "";
        });
        cursor += TEXT_KEYS.length;
        textByLabel.set(label, values);
      }
    }

    const built: Agent[] = [];
    for (let i = 0; i < totalMinted; i++) {
      const ownerResult = baseData[i * 2];
      const owner =
        ownerResult?.status === "success" && typeof ownerResult.result === "string"
          ? (ownerResult.result as Address)
          : ZERO_ADDRESS;

      const label = labels[i] ?? "";
      const text = textByLabel.get(label);
      const generation = Number.parseInt(text?.generation ?? "", 10);

      built.push({
        tokenId: BigInt(i),
        owner,
        name: nameFromLabel(label),
        ens: label ? `${label}.mnemo.eth` : "",
        generation: Number.isFinite(generation) ? generation : 0,
        parentIds: null,
        tagline: text?.tagline ?? "",
        chats: 0,
        children: 0,
        glyph: glyphForLabel(label),
      });
    }
    return built;
  }, [baseData, textData, labels, totalMinted]);

  const isLoading =
    next.isLoading ||
    (totalMinted > 0 && baseReads.isLoading) ||
    (textCalls.length > 0 && textReads.isLoading);
  const isError = next.isError || baseReads.isError || textReads.isError;
  const error =
    (next.error as Error | null) ??
    (baseReads.error as Error | null) ??
    (textReads.error as Error | null) ??
    null;

  return {
    agents,
    isLoading,
    isError,
    error,
    refetch: () => {
      next.refetch();
      baseReads.refetch();
      textReads.refetch();
    },
  };
}
