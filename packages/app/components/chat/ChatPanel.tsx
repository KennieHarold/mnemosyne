"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import type { ChatMessage } from "@/lib/chat";
import MessageList from "./MessageList";
import SuggestionBar from "./SuggestionBar";
import ChatInput from "./ChatInput";

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: ${({ theme }) => theme.bg.base};
`;

const TopBar = styled.div`
  padding: 12px 20px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.default};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: ${({ theme }) => theme.ink[2]};
  letter-spacing: 0.02em;
  flex-wrap: wrap;
`;

const SessionDot = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const Dot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.ink[1]};
`;

const Sep = styled.span`
  color: ${({ theme }) => theme.ink[3]};
`;

const ModelMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
`;

const TeePill = styled.span`
  padding: 2px 7px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ theme }) => theme.signal.live};
  letter-spacing: 0.04em;
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 24px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(120, 140, 180, 0.18);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

type Props = {
  label: string;
  initialMessages: ChatMessage[];
  suggestions: string[];
  sessionId: string;
  sessionOpenedAt: string;
  initialMemoriesWritten: number;
  modelName?: string;
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function ChatPanel({
  label,
  initialMessages,
  suggestions,
  sessionId,
  sessionOpenedAt,
  initialMemoriesWritten,
  modelName = "glm-5",
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>("queued");
  const [inFlight, setInFlight] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      const ts = Date.now();
      const userId = `u${ts}`;
      const replyId = `a${ts}`;
      const userMessage: ChatMessage = {
        id: userId,
        role: "user",
        paragraphs: [text],
      };
      const pendingMessage: ChatMessage = {
        id: replyId,
        role: "agent",
        paragraphs: [],
      };

      setMessages((prev) => [...prev, userMessage, pendingMessage]);
      setDraft("");
      setPendingId(replyId);
      setPendingStatus("queued");
      setInFlight(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          `/api/chat/${encodeURIComponent(label)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text }),
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) {
          const reason = await safeErrorText(response);
          throw new Error(reason || `request failed (${response.status})`);
        }

        await consumeNdjson(response.body, (event) => {
          if (event.type === "status") {
            setPendingStatus(event.message);
            return;
          }
          if (event.type === "delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === replyId
                  ? {
                      ...m,
                      paragraphs: appendDelta(m.paragraphs, event.content),
                    }
                  : m,
              ),
            );
            setPendingId((curr) => (curr === replyId ? null : curr));
            return;
          }
          if (event.type === "error") {
            throw new Error(event.message);
          }
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const reason = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId
              ? {
                  ...m,
                  paragraphs: appendDelta(
                    m.paragraphs,
                    `[inference failed: ${reason}]`,
                  ),
                }
              : m,
          ),
        );
      } finally {
        setPendingId(null);
        setInFlight(false);
        abortRef.current = null;
      }
    },
    [label],
  );

  const handlePick = useCallback((text: string) => {
    setDraft(text);
    inputRef.current?.focus();
  }, []);

  const turnCount = messages.length;

  return (
    <Panel>
      <TopBar>
        <Meta>
          <SessionDot>
            <Dot aria-hidden />
            session {sessionId}
          </SessionDot>
          <Sep>·</Sep>
          <span>
            {pad2(turnCount)} messages · {pad2(initialMemoriesWritten)}{" "}
            memories written
          </span>
        </Meta>
        <ModelMeta>
          <span>{modelName}</span>
          <TeePill>tee attested</TeePill>
        </ModelMeta>
      </TopBar>
      <Scroll>
        <MessageList
          messages={messages}
          sessionOpenedAt={sessionOpenedAt}
          pendingId={pendingId}
          pendingStatus={pendingStatus}
        />
      </Scroll>
      <SuggestionBar suggestions={suggestions} onPick={handlePick} />
      <ChatInput
        ref={inputRef}
        value={draft}
        onChange={setDraft}
        onSubmit={handleSend}
        disabled={inFlight}
      />
    </Panel>
  );
}

function appendDelta(paragraphs: string[], delta: string): string[] {
  if (paragraphs.length === 0) return [delta];
  const next = [...paragraphs];
  next[next.length - 1] = next[next.length - 1] + delta;
  return next;
}

async function consumeNdjson(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) onEvent(JSON.parse(line) as StreamEvent);
        newlineIndex = buffer.indexOf("\n");
      }
    }

    const trailing = buffer.trim();
    if (trailing) onEvent(JSON.parse(trailing) as StreamEvent);
  } finally {
    reader.releaseLock();
  }
}

async function safeErrorText(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "";
  } catch {
    return "";
  }
}
