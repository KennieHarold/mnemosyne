"use client";

import styled from "styled-components";
import type { Agent } from "@/lib/agent";

const HOVER_W = 220;

const Card = styled.div`
  position: absolute;
  z-index: 30;
  width: ${HOVER_W}px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 12px;
  pointer-events: none;
  opacity: 0;
  animation: hoverFade 0.18s ease forwards;

  @keyframes hoverFade {
    from {
      opacity: 0;
      transform: translateY(2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const Glyph = styled.div`
  width: 24px;
  height: 24px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: 3px;
  background: ${({ theme }) => theme.bg.base};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: ${({ theme }) => theme.ink[1]};
`;

const Name = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
`;

const Ens = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[2]};
`;

const Tagline = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Stats = styled.div`
  display: flex;
  justify-content: flex-end;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  padding-top: 6px;
  border-top: 0.5px solid ${({ theme }) => theme.line.faint};
`;

const Cta = styled.div`
  margin-top: 8px;
  padding: 5px 8px;
  background: rgba(232, 236, 241, 0.06);
  border-radius: ${({ theme }) => theme.radius.chip};
  text-align: center;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[1]};
  letter-spacing: 0.04em;
`;

type Props = {
  agent: Agent;
  left: number;
  top: number;
};

export default function HoverCard({ agent, left, top }: Props) {
  return (
    <Card style={{ left, top }} role="tooltip">
      <Top>
        <Glyph>{agent.glyph}</Glyph>
        <div>
          <Name>{agent.name}</Name>
          <Ens>{agent.ens}</Ens>
        </div>
      </Top>
      <Tagline>{agent.tagline}</Tagline>
      <Stats>
        <span>{agent.children} children</span>
      </Stats>
      <Cta>click to chat ↗</Cta>
    </Card>
  );
}

export { HOVER_W };
