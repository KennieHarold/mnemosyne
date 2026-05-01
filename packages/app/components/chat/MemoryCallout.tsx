"use client";

import styled, { css } from "styled-components";
import type { MessageMemory } from "@/lib/chat";

const Wrap = styled.div<{ $variant: "write" | "recall" }>`
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 0 ${({ theme }) => theme.radius.chip}
    ${({ theme }) => theme.radius.chip} 0;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  ${({ $variant, theme }) =>
    $variant === "write"
      ? css`
          background: rgba(93, 202, 165, 0.06);
          border: 0.5px solid rgba(93, 202, 165, 0.25);
          border-left: 2px solid ${theme.signal.live};
          color: ${theme.ink[2]};
        `
      : css`
          background: rgba(143, 164, 194, 0.05);
          border: 0.5px solid rgba(143, 164, 194, 0.2);
          border-left: 2px solid ${theme.ink[2]};
          color: ${theme.ink[2]};
        `}
`;

const Kind = styled.span<{ $variant: "write" | "recall" }>`
  font-weight: 500;
  color: ${({ $variant, theme }) =>
    $variant === "write" ? theme.signal.live : theme.ink[2]};
`;

const Sep = styled.span`
  color: ${({ theme }) => theme.ink[3]};
`;

const Tags = styled.span`
  color: ${({ theme }) => theme.ink[1]};
`;

const Trail = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.ink[3]};
  font-size: 9px;
`;

type Props = {
  memory: MessageMemory;
};

export default function MemoryCallout({ memory }: Props) {
  if (memory.kind === "write") {
    return (
      <Wrap $variant="write" role="status" aria-label="memory write">
        <Kind $variant="write">memory·write</Kind>
        <Sep>·</Sep>
        <span>themes:</span>
        <Tags>{memory.themes.join(", ")}</Tags>
        <Trail>{memory.storageId}</Trail>
      </Wrap>
    );
  }
  return (
    <Wrap $variant="recall" role="status" aria-label="memory recall">
      <Kind $variant="recall">memory·recall</Kind>
      <Sep>·</Sep>
      <span>retrieved {memory.retrieved} prior memories</span>
      <Trail>decrypted in tee</Trail>
    </Wrap>
  );
}
