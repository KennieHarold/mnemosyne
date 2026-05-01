"use client";

import { memo } from "react";
import styled, { css } from "styled-components";
import type { ChatMessage } from "@/lib/chat";
import MemoryCallout from "./MemoryCallout";

const Row = styled.div`
  display: flex;
  gap: 12px;
`;

const Prefix = styled.span<{ $role: "user" | "agent" }>`
  font-size: 9px;
  padding-top: 3px;
  min-width: 28px;
  letter-spacing: 0.04em;
  color: ${({ $role, theme }) =>
    $role === "user" ? theme.ink[3] : theme.signal.live};
`;

const Body = styled.div<{ $role: "user" | "agent" }>`
  flex: 1;
  font-size: 12px;
  line-height: 1.75;
  color: ${({ $role, theme }) =>
    $role === "user" ? theme.ink[2] : theme.ink[1]};

  > div + div {
    margin-top: 0;
  }
`;

const Caret = styled.span`
  display: inline-block;
  width: 7px;
  height: 12px;
  background: ${({ theme }) => theme.ink[1]};
  vertical-align: -1px;
  margin-left: 2px;
  animation: msgBlink 1s steps(2) infinite;

  @keyframes msgBlink {
    50% {
      opacity: 0;
    }
  }
`;

const Pending = styled.span<{ $role: "user" | "agent" }>`
  display: inline-block;
  ${({ $role, theme }) =>
    $role === "agent"
      ? css`
          color: ${theme.ink[2]};
        `
      : css`
          color: ${theme.ink[3]};
        `}
`;

type Props = {
  message: ChatMessage;
  showTrailingCaret?: boolean;
  pendingLabel?: string;
};

function MessageImpl({ message, showTrailingCaret, pendingLabel }: Props) {
  const { role, paragraphs, memory } = message;
  const isPending = paragraphs.length === 0;

  return (
    <Row>
      <Prefix $role={role}>{role === "user" ? ">you" : ">agent"}</Prefix>
      <Body $role={role}>
        {isPending ? (
          <Pending $role={role}>
            {pendingLabel ?? "thinking"}
            <Caret />
          </Pending>
        ) : (
          paragraphs.map((p, i) => (
            <div key={i}>
              {p}
              {showTrailingCaret && i === paragraphs.length - 1 && <Caret />}
            </div>
          ))
        )}
        {memory && <MemoryCallout memory={memory} />}
      </Body>
    </Row>
  );
}

export const Message = memo(MessageImpl);
export default Message;
