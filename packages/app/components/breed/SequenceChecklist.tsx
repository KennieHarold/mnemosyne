"use client";

import styled, { keyframes, css } from "styled-components";
import type { BreedPhase } from "@/lib/breed-events";

type Status = "pending" | "active" | "done";

type Step = {
  id: BreedPhase;
  label: string;
};

const STEPS: Step[] = [
  { id: "fetch-parents", label: "01·fetch parents" },
  { id: "decrypt", label: "02·decrypt intelligence" },
  { id: "merge", label: "03·guided merge" },
  { id: "encrypt", label: "04·encrypt child" },
  { id: "mint", label: "05·mint inft" },
  { id: "ens", label: "06·register ens" },
];

const PHASE_ORDER: BreedPhase[] = [
  "idle",
  "fetch-parents",
  "decrypt",
  "merge",
  "encrypt",
  "mint",
  "ens",
  "complete",
];

type Props = {
  phase: BreedPhase;
  paused: boolean;
  phaseDurations: Partial<Record<BreedPhase, number>>;
};

const blink = keyframes`
  50% { opacity: 0; }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.bg[3]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 12px 14px;
`;

const Comment = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
  margin-bottom: 10px;
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Row = styled.div<{ $status: Status }>`
  display: flex;
  justify-content: space-between;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  color: ${({ theme, $status }) =>
    $status === "active"
      ? theme.ink[1]
      : $status === "done"
        ? theme.signal.live
        : theme.ink[3]};
`;

const Time = styled.span<{ $status: Status; $paused: boolean }>`
  color: ${({ theme, $status }) =>
    $status === "active"
      ? theme.ink[1]
      : $status === "done"
        ? theme.signal.live
        : theme.ink[3]};
  ${({ $status, $paused }) =>
    $status === "active" &&
    !$paused &&
    css`
      animation: ${blink} 1s steps(2) infinite;
    `}
`;

function statusFor(phase: BreedPhase, stepId: BreedPhase): Status {
  if (phase === "error" || phase === "idle") return "pending";
  const stepIdx = PHASE_ORDER.indexOf(stepId);
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  if (stepIdx < phaseIdx) return "done";
  if (stepIdx === phaseIdx) return "active";
  return "pending";
}

function formatDuration(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  const s = ms / 1000;
  if (s < 1) return `${ms.toFixed(0)}ms`;
  return `${s.toFixed(1)}s`;
}

export default function SequenceChecklist({
  phase,
  paused,
  phaseDurations,
}: Props) {
  return (
    <Card>
      <Comment>{"// SEQUENCE"}</Comment>
      <Rows>
        {STEPS.map((step) => {
          const status = statusFor(phase, step.id);
          const dur = phaseDurations[step.id];
          let timeLabel = "—";
          if (status === "done")
            timeLabel = `✓ ${formatDuration(dur)}`;
          else if (status === "active") timeLabel = "▌";
          return (
            <Row key={step.id} $status={status}>
              <span>{step.label}</span>
              <Time $status={status} $paused={paused}>
                {timeLabel}
              </Time>
            </Row>
          );
        })}
      </Rows>
    </Card>
  );
}
