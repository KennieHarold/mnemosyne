"use client";

import { useCallback, useRef, useState } from "react";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, type Hex } from "viem";
import { mnemoAgentNftAbi, mnemoAgentNftAddress } from "@/lib/contracts";
import {
  validateMintForm,
  type MintFormState,
  type MintPhase,
} from "@/lib/mint";
import type { AgentIntelligence } from "@/lib/breed-events";

type UploadResponse = {
  encryptedURI: Hex;
  metadataHash: Hex;
  schema: AgentIntelligence;
};

type UploadError = { error?: string };

export type UseMintAgentReturn = {
  phase: MintPhase;
  error: string | null;
  schema: AgentIntelligence | null;
  encryptedURI: Hex | null;
  mintTxHash: Hex | null;
  textsTxHash: Hex | null;
  tokenId: bigint | null;
  isConnected: boolean;
  start: (form: MintFormState) => Promise<void>;
  reset: () => void;
};

export function useMintAgent(): UseMintAgentReturn {
  const { address, isConnected } = useConnection();
  const publicClient = usePublicClient();
  const { writeContractAsync, reset: resetWrite } = useWriteContract();

  const [phase, setPhase] = useState<MintPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<AgentIntelligence | null>(null);
  const [encryptedURI, setEncryptedURI] = useState<Hex | null>(null);
  const [mintTxHash, setMintTxHash] = useState<Hex | null>(null);
  const [textsTxHash, setTextsTxHash] = useState<Hex | null>(null);
  const [tokenId, setTokenId] = useState<bigint | null>(null);

  const inFlightRef = useRef(false);

  const reset = useCallback(() => {
    inFlightRef.current = false;
    setPhase("idle");
    setError(null);
    setSchema(null);
    setEncryptedURI(null);
    setMintTxHash(null);
    setTextsTxHash(null);
    setTokenId(null);
    resetWrite();
  }, [resetWrite]);

  const start = useCallback(
    async (form: MintFormState) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);

      if (!isConnected || !address) {
        setError("connect a wallet to mint");
        setPhase("error");
        inFlightRef.current = false;
        return;
      }
      if (!publicClient) {
        setError("rpc client unavailable");
        setPhase("error");
        inFlightRef.current = false;
        return;
      }

      const validation = validateMintForm(form);
      if (!validation.ok) {
        setError(validation.error);
        setPhase("error");
        inFlightRef.current = false;
        return;
      }

      setPhase("schema");

      try {
        const taken = (await publicClient.readContract({
          address: mnemoAgentNftAddress,
          abi: mnemoAgentNftAbi,
          functionName: "isLabelTaken",
          args: [validation.schema.ensLabel],
        })) as boolean;
        if (taken) {
          throw new Error(
            `${validation.schema.ensLabel}.mnemo.eth is already minted — choose another name`,
          );
        }

        setPhase("encrypt");

        const response = await fetch("/api/mint/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) {
          const payload = (await response
            .json()
            .catch(() => ({}))) as UploadError;
          throw new Error(
            payload.error ?? `upload failed (${response.status})`,
          );
        }
        const upload = (await response.json()) as UploadResponse;
        setSchema(upload.schema);
        setEncryptedURI(upload.encryptedURI);

        setPhase("mint");

        const mintHash = await writeContractAsync({
          address: mnemoAgentNftAddress,
          abi: mnemoAgentNftAbi,
          functionName: "mintWithSubname",
          args: [
            [upload.encryptedURI],
            ["intelligence"],
            address,
            upload.schema.ensLabel,
          ],
        });
        setMintTxHash(mintHash);

        const mintReceipt = await publicClient.waitForTransactionReceipt({
          hash: mintHash,
          pollingInterval: 2_000,
          retryCount: 30,
          timeout: 300_000,
        });
        if (mintReceipt.status !== "success") {
          throw new Error("mint reverted on chain");
        }

        let mintedTokenId: bigint | null = null;
        for (const log of mintReceipt.logs) {
          if (
            log.address.toLowerCase() !== mnemoAgentNftAddress.toLowerCase()
          ) {
            continue;
          }
          try {
            const decoded = decodeEventLog({
              abi: mnemoAgentNftAbi,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "SubnameIssued") {
              const args = decoded.args as { tokenId: bigint };
              mintedTokenId = args.tokenId;
              break;
            }
          } catch {}
        }
        if (mintedTokenId === null) {
          throw new Error("could not read tokenId from mint receipt");
        }
        setTokenId(mintedTokenId);

        setPhase("texts");

        const keys = ["generation", "traits", "tagline"];
        const values = [
          "0",
          upload.schema.traits.join(","),
          upload.schema.tagline,
        ];
        const textsHash = await writeContractAsync({
          address: mnemoAgentNftAddress,
          abi: mnemoAgentNftAbi,
          functionName: "setTexts",
          args: [mintedTokenId, keys, values],
        });
        setTextsTxHash(textsHash);

        const textsReceipt = await publicClient.waitForTransactionReceipt({
          hash: textsHash,
          pollingInterval: 2_000,
          retryCount: 30,
          timeout: 300_000,
        });
        if (textsReceipt.status !== "success") {
          throw new Error("setTexts reverted on chain");
        }

        setPhase("complete");
      } catch (err) {
        const e = err as { name?: string; shortMessage?: string };
        if (e.name === "UserRejectedRequestError") {
          setError("transaction rejected in wallet");
        } else {
          setError(
            e.shortMessage ??
              (err instanceof Error ? err.message : String(err)),
          );
        }
        setPhase("error");
      } finally {
        inFlightRef.current = false;
      }
    },
    [address, isConnected, publicClient, writeContractAsync],
  );

  return {
    phase,
    error,
    schema,
    encryptedURI,
    mintTxHash,
    textsTxHash,
    tokenId,
    isConnected,
    start,
    reset,
  };
}
