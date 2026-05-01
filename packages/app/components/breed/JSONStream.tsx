"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import type { AgentIntelligence } from "@/lib/breed-events";

const TYPE_INTERVAL_MS = 14;

type Segment = {
  start: number;
  end: number;
  kind: "key" | "string" | "punct";
};

type Props = {
  child: AgentIntelligence | null;
  paused: boolean;
};

const blink = keyframes`
  50% { opacity: 0; }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.bg[3]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* Prevent the card's content from driving the grid row height —
     it stretches to whatever the right column happens to be. */
  height: 0;
  min-height: 100%;
`;

const Header = styled.div`
  padding: 10px 14px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.faint};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Comment = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
`;

const SealedTag = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.signal.live};
`;

const StreamPre = styled.pre`
  margin: 0;
  padding: 14px;
  font-family: ${({ theme }) => theme.font.mono};
  font-size: 10px;
  line-height: 1.7;
  color: ${({ theme }) => theme.ink[2]};
  flex: 1;
  min-height: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
`;

const Span = styled.span<{ $kind: Segment["kind"] }>`
  ${({ theme, $kind }) => {
    if ($kind === "key") return css`color: ${theme.ink[1]};`;
    if ($kind === "string") return css`color: ${theme.ink[2]};`;
    return css`color: ${theme.ink[3]};`;
  }}
`;

const Caret = styled.span<{ $paused: boolean }>`
  display: inline-block;
  width: 6px;
  height: 11px;
  background: ${({ theme }) => theme.ink[1]};
  vertical-align: -1px;
  margin-left: 1px;
  ${({ $paused }) =>
    !$paused &&
    css`
      animation: ${blink} 1s steps(2) infinite;
    `}
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.ink[3]};
`;

function buildVisibleSchema(
  child: AgentIntelligence,
): Record<string, unknown> {
  return {
    displayName: child.displayName,
    ensLabel: child.ensLabel,
    tagline: child.tagline,
    systemPrompt: child.systemPrompt,
    traits: child.traits,
    skills: child.skills,
    memory: {
      facts: child.memory.facts,
      themes: child.memory.themes,
    },
  };
}

function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /"((?:[^"\\]|\\.)*)"/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastEnd) {
      segments.push({ start: lastEnd, end: match.index, kind: "punct" });
    }
    let nextIdx = match.index + match[0].length;
    while (nextIdx < text.length && /\s/.test(text[nextIdx])) nextIdx++;
    const isKey = text[nextIdx] === ":";
    segments.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: isKey ? "key" : "string",
    });
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd < text.length) {
    segments.push({ start: lastEnd, end: text.length, kind: "punct" });
  }
  return segments;
}

function Typewriter({
  formatted,
  paused,
  scrollRef,
}: {
  formatted: string;
  paused: boolean;
  scrollRef: React.RefObject<HTMLPreElement | null>;
}) {
  const segments = useMemo(() => tokenize(formatted), [formatted]);
  const [revealed, setRevealed] = useState(0);
  const lastTickRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    if (revealed >= formatted.length) return;

    const tick = (now: number) => {
      if (lastTickRef.current === 0) lastTickRef.current = now;
      const elapsed = now - lastTickRef.current;
      const advance = Math.floor(elapsed / TYPE_INTERVAL_MS);
      if (advance > 0) {
        lastTickRef.current = now;
        setRevealed((prev) => Math.min(formatted.length, prev + advance));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [formatted, paused, revealed]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [revealed, scrollRef]);

  const isComplete = revealed >= formatted.length;

  return (
    <>
      {segments.map((seg, i) => {
        const visible = Math.max(0, Math.min(seg.end, revealed) - seg.start);
        if (visible === 0) return null;
        const text = formatted.slice(seg.start, seg.start + visible);
        return (
          <Span key={i} $kind={seg.kind}>
            {text}
          </Span>
        );
      })}
      {!isComplete && <Caret $paused={paused} />}
    </>
  );
}

export default function JSONStream({ child, paused }: Props) {
  const formatted = child
    ? JSON.stringify(buildVisibleSchema(child), null, 2)
    : "";
  const preRef = useRef<HTMLPreElement>(null);

  return (
    <Card>
      <Header>
        <Comment>{"// MERGE OUTPUT · GLM-5"}</Comment>
        <SealedTag>sealed inference</SealedTag>
      </Header>
      <StreamPre ref={preRef}>
        {!child && (
          <>
            <Placeholder>{"awaiting guided merge"}</Placeholder>
            <Caret $paused={paused} />
          </>
        )}
        {child && (
          <Typewriter
            key={formatted}
            formatted={formatted}
            paused={paused}
            scrollRef={preRef}
          />
        )}
      </StreamPre>
    </Card>
  );
}
