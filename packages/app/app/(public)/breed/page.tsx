"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styled, { keyframes, css } from "styled-components";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MergeStage from "@/components/breed/MergeStage";
import JSONStream from "@/components/breed/JSONStream";
import SequenceChecklist from "@/components/breed/SequenceChecklist";
import RoyaltySplit from "@/components/breed/RoyaltySplit";
import CompletionBanner from "@/components/breed/CompletionBanner";
import { useBreedCeremony } from "@/hooks/useBreedCeremony";
import { useAgents } from "@/hooks/useAgents";
import { labelFromAgent, type Agent } from "@/lib/agent";
import type { BreedPhase } from "@/lib/breed-events";

const DEFAULT_P1 = "socrates";
const DEFAULT_P2 = "sherlock";

const Page = styled.div`
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg.base};
  overflow: hidden;
`;

const Main = styled.main`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const StageWrap = styled.section`
  position: relative;
  background: ${({ theme }) => theme.bg.base};
  background-image: radial-gradient(
    ellipse at 50% 50%,
    rgba(40, 60, 110, 0.12) 0%,
    transparent 70%
  );
  padding: 14px 28px 24px;
`;

const HeaderRow = styled.header`
  padding: 18px 28px 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
`;

const TitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Comment = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.16em;
`;

const Heading = styled.h1`
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
`;

const live = keyframes`
  50% { opacity: 0.55; }
`;

const LiveIndicator = styled.div<{ $tone: "pending" | "live" | "muted" }>`
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) =>
    $tone === "live"
      ? theme.signal.live
      : $tone === "pending"
        ? theme.signal.pending
        : theme.ink[3]};
`;

const Dot = styled.span<{
  $tone: "pending" | "live" | "muted";
  $paused: boolean;
}>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme, $tone }) =>
    $tone === "live"
      ? theme.signal.live
      : $tone === "pending"
        ? theme.signal.pending
        : theme.ink[3]};
  box-shadow: 0 0 8px
    ${({ theme, $tone }) =>
      $tone === "live"
        ? theme.signal.live
        : $tone === "pending"
          ? theme.signal.pending
          : "transparent"};
  ${({ $tone, $paused }) =>
    $tone !== "muted" &&
    !$paused &&
    css`
      animation: ${live} 1.6s ease-in-out infinite;
    `}
`;

const Controls = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 10px 0 0;
`;

const PrimaryBtn = styled.button`
  font-family: inherit;
  font-size: 10px;
  padding: 7px 14px;
  background: ${({ theme }) => theme.cta.bg};
  color: ${({ theme }) => theme.cta.fg};
  border: none;
  border-radius: ${({ theme }) => theme.radius.default};
  letter-spacing: 0.04em;
  font-weight: 500;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GhostBtn = styled.button`
  font-family: inherit;
  font-size: 10px;
  padding: 7px 14px;
  background: transparent;
  color: ${({ theme }) => theme.ink[1]};
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.default};
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.bg[1]};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Hint = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  margin-left: 8px;
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 4px 28px 20px;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const RightStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ErrorBar = styled.div`
  margin: 0 28px 12px;
  padding: 10px 14px;
  background: rgba(220, 90, 90, 0.06);
  border: 0.5px solid rgba(220, 90, 90, 0.4);
  border-radius: ${({ theme }) => theme.radius.card};
  font-size: 11px;
  color: #ef9f9f;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

function statusText(phase: BreedPhase, ensLabel?: string): string {
  switch (phase) {
    case "idle":
      return "ready to breed";
    case "fetch-parents":
      return "fetching parents from 0G storage";
    case "decrypt":
      return "decrypting parent intelligence";
    case "merge":
      return "guided merge · streaming child genome";
    case "encrypt":
      return "encrypting child intelligence";
    case "mint":
      return "minting iNFT · awaiting wallet signature";
    case "ens":
      return "registering ens subname";
    case "complete":
      return ensLabel
        ? `${ensLabel}.mnemo.eth has been born`
        : "child has been born";
    case "error":
      return "ceremony failed";
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${pad2(m)}:${pad2(Math.floor(s))}.${Math.floor((s % 1) * 10)}`;
}

function findAgentByLabel(agents: Agent[], label: string): Agent | undefined {
  const target = label.toLowerCase();
  return agents.find((a) => labelFromAgent(a).toLowerCase() === target);
}

function BreedPageInner() {
  const search = useSearchParams();
  const parent1Label = (search.get("p1") ?? search.get("with") ?? DEFAULT_P1)
    .trim()
    .toLowerCase();
  const parent2Label = (search.get("p2") ?? DEFAULT_P2).trim().toLowerCase();

  const { agents } = useAgents();
  const parent1Agent = useMemo(
    () => findAgentByLabel(agents, parent1Label),
    [agents, parent1Label],
  );
  const parent2Agent = useMemo(
    () => findAgentByLabel(agents, parent2Label),
    [agents, parent2Label],
  );

  const ceremony = useBreedCeremony({ parent1Label, parent2Label });

  const [now, setNow] = useState<number>(() =>
    typeof performance !== "undefined" ? performance.now() : Date.now(),
  );

  useEffect(() => {
    if (
      ceremony.startedAt === null ||
      ceremony.phase === "complete" ||
      ceremony.phase === "error" ||
      ceremony.paused
    ) {
      return;
    }
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ceremony.startedAt, ceremony.phase, ceremony.paused]);

  const elapsedSeconds =
    ceremony.startedAt !== null ? (now - ceremony.startedAt) / 1000 : 0;

  const isRunning =
    ceremony.phase !== "idle" &&
    ceremony.phase !== "complete" &&
    ceremony.phase !== "error";
  const isComplete = ceremony.phase === "complete";

  const indicatorTone: "pending" | "live" | "muted" = isComplete
    ? "live"
    : isRunning
      ? "pending"
      : "muted";

  const indicatorLabel = isComplete
    ? `complete · ${formatElapsed(elapsedSeconds)}`
    : isRunning
      ? `streaming · ${formatElapsed(elapsedSeconds)}`
      : ceremony.phase === "error"
        ? "halted"
        : "idle";

  const sameLabel = parent1Label === parent2Label;

  return (
    <Page>
      <Header />
      <Main>
        <HeaderRow>
          <TitleStack>
            <Comment>{"// BREEDING CEREMONY"}</Comment>
            <Heading>
              {statusText(ceremony.phase, ceremony.child?.ensLabel)}
            </Heading>
          </TitleStack>
          <LiveIndicator $tone={indicatorTone}>
            <Dot $tone={indicatorTone} $paused={ceremony.paused} />
            <span>{indicatorLabel}</span>
          </LiveIndicator>
        </HeaderRow>

        {ceremony.error && (
          <ErrorBar>
            <span>{ceremony.error}</span>
            <GhostBtn type="button" onClick={ceremony.reset}>
              dismiss
            </GhostBtn>
          </ErrorBar>
        )}

        <StageWrap>
          <MergeStage
            phase={ceremony.phase}
            paused={ceremony.paused}
            parent1Label={parent1Label}
            parent2Label={parent2Label}
            parent1DisplayName={parent1Agent?.name}
            parent2DisplayName={parent2Agent?.name}
            child={ceremony.child}
          />
          <Controls>
            {ceremony.phase === "idle" || ceremony.phase === "error" ? (
              <PrimaryBtn
                type="button"
                onClick={ceremony.start}
                disabled={!ceremony.isConnected || sameLabel}
              >
                {!ceremony.isConnected
                  ? "[ connect wallet to begin → ]"
                  : sameLabel
                    ? "[ choose two distinct parents ]"
                    : "[ begin ceremony → ]"}
              </PrimaryBtn>
            ) : (
              <PrimaryBtn
                type="button"
                onClick={ceremony.restart}
                disabled={isRunning && !isComplete}
              >
                [ restart ceremony ↻ ]
              </PrimaryBtn>
            )}
            <GhostBtn
              type="button"
              onClick={ceremony.paused ? ceremony.resume : ceremony.pause}
              disabled={!isRunning}
            >
              {ceremony.paused ? "resume" : "pause"}
            </GhostBtn>
            <Hint>
              {ceremony.isConnected
                ? "you sign the mint with your connected wallet"
                : "wallet required to mint the child iNFT"}
            </Hint>
          </Controls>
        </StageWrap>

        {isComplete && ceremony.child && (
          <CompletionBanner
            child={ceremony.child}
            txHash={ceremony.txHash}
            childTokenId={ceremony.childTokenId}
            totalSeconds={elapsedSeconds}
          />
        )}

        <Grid>
          <JSONStream child={ceremony.child} paused={ceremony.paused} />
          <RightStack>
            <SequenceChecklist
              phase={ceremony.phase}
              paused={ceremony.paused}
              phaseDurations={ceremony.phaseDurations}
            />
            <RoyaltySplit
              parent1Label={parent1Label}
              parent2Label={parent2Label}
            />
          </RightStack>
        </Grid>
      </Main>
      <Footer />
    </Page>
  );
}

export default function BreedPage() {
  return (
    <Suspense fallback={null}>
      <BreedPageInner />
    </Suspense>
  );
}
