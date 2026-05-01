"use client";

import { useEffect, useRef } from "react";
import styled from "styled-components";
import type { ChatMessage } from "@/lib/chat";
import Message from "./Message";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Divider = styled.div`
  text-align: center;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[4]};
  letter-spacing: 0.1em;
  padding: 4px 0;
`;

type Props = {
  messages: ChatMessage[];
  sessionOpenedAt: string;
  pendingId?: string | null;
  pendingStatus?: string;
};

export default function MessageList({
  messages,
  sessionOpenedAt,
  pendingId,
  pendingStatus,
}: Props) {
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tailRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, pendingId, pendingStatus]);

  return (
    <Stack>
      <Divider>— session opened · {sessionOpenedAt} —</Divider>
      {messages.map((m, i) => {
        const isLast = i === messages.length - 1;
        const isPendingTarget = pendingId === m.id;
        return (
          <Message
            key={m.id}
            message={m}
            showTrailingCaret={isLast && m.role === "agent" && !isPendingTarget}
            pendingLabel={isPendingTarget ? pendingStatus : undefined}
          />
        );
      })}
      <div ref={tailRef} />
    </Stack>
  );
}
