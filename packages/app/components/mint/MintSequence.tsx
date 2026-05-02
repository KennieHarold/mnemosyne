"use client";

import styled, { css, keyframes } from "styled-components";
import { MINT_PHASE_ORDER, type MintPhase } from "@/lib/mint";

type Status = "pending" | "active" | "done";

const STEPS: {
  id: Exclude<MintPhase, "idle" | "complete" | "error">;
  label: string;
}[] = [
  { id: "schema", label: "01·schema" },
  { id: "encrypt", label: "02·encrypt" },
  { id: "mint", label: "03·mint inft" },
  { id: "texts", label: "04·set texts" },
];

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
`;

const blink = keyframes`
  50% { opacity: 0.4; }
`;

const Cell = styled.div<{ $status: Status }>`
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  letter-spacing: 0.04em;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.default};
  border: 0.5px ${({ $status }) => ($status === "pending" ? "dashed" : "solid")}
    ${({ theme, $status }) =>
      $status === "done"
        ? "rgba(93, 202, 165, 0.4)"
        : $status === "active"
          ? theme.line.strong
          : theme.line.medium};
  color: ${({ theme, $status }) =>
    $status === "done"
      ? theme.signal.live
      : $status === "active"
        ? theme.ink[1]
        : theme.ink[3]};
  background: ${({ $status, theme }) =>
    $status === "active" ? "rgba(232, 236, 241, 0.04)" : theme.bg[3]};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;

  ${({ $status }) =>
    $status === "active" &&
    css`
      animation: ${blink} 1.4s ease-in-out infinite;
    `}
`;

const Mark = styled.span`
  font-size: 10px;
`;

function statusFor(phase: MintPhase, stepId: MintPhase): Status {
  if (phase === "complete") return "done";
  if (phase === "error" || phase === "idle") return "pending";
  const stepIdx = MINT_PHASE_ORDER.indexOf(stepId);
  const phaseIdx = MINT_PHASE_ORDER.indexOf(phase);
  if (stepIdx < phaseIdx) return "done";
  if (stepIdx === phaseIdx) return "active";
  return "pending";
}

type Props = {
  phase: MintPhase;
};

export default function MintSequence({ phase }: Props) {
  return (
    <Row>
      {STEPS.map((step) => {
        const status = statusFor(phase, step.id);
        const mark = status === "done" ? "✓" : status === "active" ? "▌" : "·";
        return (
          <Cell key={step.id} $status={status}>
            <span>{step.label}</span>
            <Mark aria-hidden>{mark}</Mark>
          </Cell>
        );
      })}
    </Row>
  );
}
