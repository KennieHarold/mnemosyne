"use client";

import styled from "styled-components";
import type { Agent } from "@/lib/agent";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

const Card = styled.button<{ $mine: boolean }>`
  position: relative;
  text-align: left;
  font-family: inherit;
  background: rgba(14, 18, 32, 0.6);
  border: 0.5px solid
    ${({ theme, $mine }) =>
      $mine ? "rgba(93, 202, 165, 0.3)" : theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 14px;
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
  color: inherit;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    background: ${({ theme }) => theme.signal.live};
    opacity: ${({ $mine }) => ($mine ? 1 : 0)};
  }

  &:hover {
    border-color: ${({ theme }) => theme.line.strong};
    background: rgba(20, 24, 34, 0.85);
    transform: translateY(-1px);
  }

  &:hover .chat-cta {
    opacity: 1;
    transform: translateX(0);
  }

  &:focus-visible {
    outline: 1.5px solid ${({ theme }) => theme.ink[1]};
    outline-offset: 2px;
  }
`;

const Cta = styled.span`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 9px;
  padding: 3px 8px;
  background: ${({ theme }) => theme.cta.bg};
  color: ${({ theme }) => theme.cta.fg};
  border-radius: ${({ theme }) => theme.radius.chip};
  opacity: 0;
  transform: translateX(4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  letter-spacing: 0.04em;
  font-weight: 500;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const Glyph = styled.div`
  width: 36px;
  height: 36px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.default};
  background: ${({ theme }) => theme.bg.base};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: ${({ theme }) => theme.ink[1]};
  flex-shrink: 0;
`;

const NameRow = styled.div`
  min-width: 0;
  flex: 1;
`;

const Name = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
  display: flex;
  align-items: center;
`;

const Mine = styled.span`
  color: ${({ theme }) => theme.signal.live};
  font-size: 9px;
  margin-left: 4px;
`;

const Ens = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[2]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Tagline = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  line-height: 1.5;
  margin-bottom: 10px;
  height: 30px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const TraitRow = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-content: flex-start;
  margin-bottom: 10px;
  height: 44px;
  overflow: hidden;
`;

const Trait = styled.span`
  font-size: 9px;
  padding: 2px 6px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ theme }) => theme.ink[2]};
  white-space: nowrap;
  flex-shrink: 0;
`;

const EmptyTraits = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.04em;
`;

const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  padding-top: 8px;
  border-top: 0.5px solid ${({ theme }) => theme.line.faint};
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
`;

type Props = {
  agent: Agent;
  isMine: boolean;
  onClick: () => void;
};

export default function AgentCard({ agent, isMine, onClick }: Props) {
  const traits = agent.traits;

  return (
    <Card
      type="button"
      $mine={isMine}
      onClick={onClick}
      aria-label={`Open chat with ${agent.name || agent.ens}`}
    >
      <Cta className="chat-cta">chat ↗</Cta>
      <Top>
        <Glyph aria-hidden>{agent.glyph}</Glyph>
        <NameRow>
          <Name>
            {agent.name || "unknown"}
            {isMine && <Mine>·yours</Mine>}
          </Name>
          <Ens>{agent.ens || "—"}</Ens>
        </NameRow>
      </Top>
      <Tagline>{agent.tagline || "no description on record."}</Tagline>
      <TraitRow>
        {traits.length > 0 ? (
          traits.map((t) => <Trait key={t}>{t}</Trait>)
        ) : (
          <EmptyTraits>no traits on record</EmptyTraits>
        )}
      </TraitRow>
      <Meta>
        <span>gen·{pad2(agent.generation)}</span>
        <span>
          {agent.children} kid{agent.children === 1 ? "" : "s"}
        </span>
      </Meta>
    </Card>
  );
}
