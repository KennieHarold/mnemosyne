"use client";

import { useCallback, useRef, useState } from "react";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import {
  decodeEventLog,
  TransactionReceiptNotFoundError,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { mnemoAgentNftAbi, mnemoAgentNftAddress } from "@/lib/contracts";

const RECEIPT_POLL_INTERVAL_MS = 3_000;
const RECEIPT_TIMEOUT_MS = 600_000;

async function pollForReceipt(
  client: PublicClient,
  hash: Hex,
): Promise<TransactionReceipt> {
  const deadline = Date.now() + RECEIPT_TIMEOUT_MS;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      return await client.getTransactionReceipt({ hash });
    } catch (err) {
      lastErr = err;
      if (!(err instanceof TransactionReceiptNotFoundError)) {
        const code = (err as { name?: string })?.name;
        if (code !== "TransactionReceiptNotFoundError") {
          throw err;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, RECEIPT_POLL_INTERVAL_MS));
  }
  throw new Error(
    `tx ${hash} not mined within ${Math.round(RECEIPT_TIMEOUT_MS / 1000)}s` +
      (lastErr instanceof Error ? ` — last error: ${lastErr.message}` : ""),
  );
}
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

        const mintReceipt = await pollForReceipt(publicClient, mintHash);
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

        const textsReceipt = await pollForReceipt(publicClient, textsHash);
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
