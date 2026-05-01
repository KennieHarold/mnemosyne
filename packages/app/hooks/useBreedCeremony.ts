"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useConnection,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { decodeEventLog, type Address, type Hex } from "viem";
import { mnemoAgentNftAbi, mnemoAgentNftAddress } from "@/lib/contracts";
import type {
  AgentIntelligence,
  BreedEvent,
  BreedPhase,
  ParentSummary,
} from "@/lib/breed-events";

type Args = {
  parent1Label: string;
  parent2Label: string;
};

type MintArgs = {
  encryptedURI: Hex;
  parent1TokenId: bigint;
  parent2TokenId: bigint;
  ensLabel: string;
};

type PhaseDurations = Partial<Record<BreedPhase, number>>;

const TIMED_PHASES: BreedPhase[] = [
  "fetch-parents",
  "decrypt",
  "merge",
  "encrypt",
  "mint",
  "ens",
];

export type UseBreedCeremonyReturn = {
  phase: BreedPhase;
  parents: [ParentSummary, ParentSummary] | null;
  child: AgentIntelligence | null;
  txHash: Hex | null;
  childTokenId: bigint | null;
  holder: Address | null;
  generation: bigint | null;
  error: string | null;
  paused: boolean;
  isConnected: boolean;
  startedAt: number | null;
  phaseDurations: PhaseDurations;
  start: () => void;
  restart: () => void;
  reset: () => void;
  pause: () => void;
  resume: () => void;
};

export function useBreedCeremony({
  parent1Label,
  parent2Label,
}: Args): UseBreedCeremonyReturn {
  const { address, isConnected } = useConnection();
  const { writeContractAsync, reset: resetWrite } = useWriteContract();

  const [phase, setPhase] = useState<BreedPhase>("idle");
  const [parents, setParents] = useState<[ParentSummary, ParentSummary] | null>(
    null,
  );
  const [child, setChild] = useState<AgentIntelligence | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [childTokenId, setChildTokenId] = useState<bigint | null>(null);
  const [holder, setHolder] = useState<Address | null>(null);
  const [generation, setGeneration] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [phaseDurations, setPhaseDurations] = useState<PhaseDurations>({});

  const abortRef = useRef<AbortController | null>(null);
  const phaseStartRef = useRef<number>(0);
  const currentPhaseRef = useRef<BreedPhase>("idle");
  const processedReceiptRef = useRef<string | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const recordPhaseEnd = useCallback(() => {
    const previous = currentPhaseRef.current;
    if (!TIMED_PHASES.includes(previous)) return;
    const dur = performance.now() - phaseStartRef.current;
    setPhaseDurations((prev) => ({ ...prev, [previous]: dur }));
  }, []);

  const advancePhase = useCallback(
    (next: BreedPhase) => {
      recordPhaseEnd();
      currentPhaseRef.current = next;
      phaseStartRef.current = performance.now();
      setPhase(next);
    },
    [recordPhaseEnd],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (completionTimerRef.current !== null) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    processedReceiptRef.current = null;
    setPhase("idle");
    setParents(null);
    setChild(null);
    setTxHash(null);
    setChildTokenId(null);
    setHolder(null);
    setGeneration(null);
    setError(null);
    setPaused(false);
    setStartedAt(null);
    setPhaseDurations({});
    currentPhaseRef.current = "idle";
    phaseStartRef.current = 0;
    resetWrite();
  }, [resetWrite]);

  const runCeremony = useCallback(async () => {
    if (!isConnected || !address) {
      setError("connect a wallet to begin the ceremony");
      return;
    }
    if (!parent1Label || !parent2Label || parent1Label === parent2Label) {
      setError("two distinct parent labels are required");
      return;
    }

    setStartedAt(performance.now());
    advancePhase("fetch-parents");

    const controller = new AbortController();
    abortRef.current = controller;

    let mintArgs: MintArgs | null = null;

    try {
      const response = await fetch("/api/breed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent1Label, parent2Label }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `breed request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      streamLoop: while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: BreedEvent;
          try {
            event = JSON.parse(trimmed) as BreedEvent;
          } catch {
            continue;
          }

          if (event.type === "phase") {
            advancePhase(event.phase);
          } else if (event.type === "parents") {
            setParents(event.parents);
          } else if (event.type === "ready-to-mint") {
            setChild(event.schema);
            mintArgs = {
              encryptedURI: event.encryptedURI,
              parent1TokenId: BigInt(event.parent1TokenId),
              parent2TokenId: BigInt(event.parent2TokenId),
              ensLabel: event.schema.ensLabel,
            };
            break streamLoop;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      if (!mintArgs) {
        throw new Error("breed pipeline ended without ready-to-mint event");
      }

      advancePhase("mint");
      const hash = await writeContractAsync({
        address: mnemoAgentNftAddress,
        abi: mnemoAgentNftAbi,
        functionName: "breed",
        args: [
          mintArgs.parent1TokenId,
          mintArgs.parent2TokenId,
          address,
          [mintArgs.encryptedURI],
          ["intelligence"],
          mintArgs.ensLabel,
        ],
      });
      setTxHash(hash);
    } catch (err) {
      const e = err as { name?: string };
      if (e.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      advancePhase("error");
    }
  }, [
    isConnected,
    address,
    parent1Label,
    parent2Label,
    advancePhase,
    writeContractAsync,
  ]);

  const start = useCallback(() => {
    reset();
    void runCeremony();
  }, [reset, runCeremony]);

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    query: { enabled: txHash !== null },
  });

  useEffect(() => {
    if (!receipt) return;
    if (processedReceiptRef.current === receipt.transactionHash) return;
    processedReceiptRef.current = receipt.transactionHash;

    const handle = setTimeout(() => {
      advancePhase("ens");
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== mnemoAgentNftAddress.toLowerCase()) {
          continue;
        }
        try {
          const decoded = decodeEventLog({
            abi: mnemoAgentNftAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "Bred") {
            const args = decoded.args as {
              childTokenId: bigint;
              generation: bigint;
            };
            setChildTokenId(args.childTokenId);
            setGeneration(args.generation);
          } else if (decoded.eventName === "SubnameIssued") {
            const args = decoded.args as { holder: Address };
            setHolder(args.holder);
          }
        } catch {
          // non-decodable logs (e.g. ERC-721 Transfer) are expected; skip
        }
      }
      completionTimerRef.current = setTimeout(() => {
        advancePhase("complete");
        completionTimerRef.current = null;
      }, 800);
    }, 0);
    return () => {
      clearTimeout(handle);
    };
  }, [receipt, advancePhase]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (completionTimerRef.current !== null) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, []);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  return {
    phase,
    parents,
    child,
    txHash,
    childTokenId,
    holder,
    generation,
    error,
    paused,
    isConnected,
    startedAt,
    phaseDurations,
    start,
    restart: start,
    reset,
    pause,
    resume,
  };
}
