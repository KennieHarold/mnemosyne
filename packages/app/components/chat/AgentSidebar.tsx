"use client";

import Link from "next/link";
import styled from "styled-components";
import type { Agent } from "@/lib/agent";
import { labelFromAgent } from "@/lib/agent";
import type { AgentExtras, LineageParent } from "@/lib/chat";
import LineageMini from "./LineageMini";
import ProvenanceTable from "./ProvenanceTable";

const TRAITS_VISIBLE = 5;

const Aside = styled.aside`
  border-right: 0.5px solid ${({ theme }) => theme.line.default};
  background: rgba(10, 12, 18, 0.6);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;

  scrollbar-width: thin;
  scrollbar-color: rgba(120, 140, 180, 0.28) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: linear-gradient(
      to right,
      transparent 0,
      transparent 2px,
      rgba(120, 140, 180, 0.06) 2px,
      rgba(120, 140, 180, 0.06) 3px,
      transparent 3px
    );
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(
      180deg,
      rgba(143, 164, 194, 0.0) 0%,
      rgba(143, 164, 194, 0.55) 12%,
      rgba(143, 164, 194, 0.55) 88%,
      rgba(143, 164, 194, 0.0) 100%
    );
    border-radius: 999px;
    box-shadow:
      inset 0 0 0 0.5px rgba(232, 236, 241, 0.08),
      0 0 6px rgba(93, 202, 165, 0.0);
    transition: box-shadow 0.18s ease, background 0.18s ease;
  }

  &:hover::-webkit-scrollbar-thumb,
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      rgba(93, 202, 165, 0.0) 0%,
      rgba(93, 202, 165, 0.85) 14%,
      rgba(143, 164, 194, 0.85) 50%,
      rgba(93, 202, 165, 0.85) 86%,
      rgba(93, 202, 165, 0.0) 100%
    );
    box-shadow:
      inset 0 0 0 0.5px rgba(232, 236, 241, 0.16),
      0 0 8px rgba(93, 202, 165, 0.45);
  }

  &::-webkit-scrollbar-thumb:active {
    background: ${({ theme }) => theme.signal.live};
    box-shadow:
      inset 0 0 0 0.5px rgba(232, 236, 241, 0.32),
      0 0 10px rgba(93, 202, 165, 0.7);
  }

  &::-webkit-scrollbar-button {
    height: 0;
    width: 0;
  }
`;

const Section = styled.div`
  padding: 14px 18px;
  border-top: 0.5px solid ${({ theme }) => theme.line.faint};

  &:first-child {
    border-top: none;
    padding: 18px 18px 14px;
  }
`;

const Comment = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
  margin-bottom: 10px;
`;

const HeadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
`;

const AvatarWrap = styled.div`
  position: relative;
`;

const Avatar = styled.svg`
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.card};
  background: ${({ theme }) => theme.bg[2]};
  display: block;
`;

const PresenceDot = styled.span`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: ${({ theme }) => theme.signal.live};
  border: 1.5px solid ${({ theme }) => theme.bg[1]};
  border-radius: 50%;
`;

const HeadInfo = styled.div`
  min-width: 0;
  flex: 1;
`;

const Name = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
`;

const Ens = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Status = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.signal.live};
  margin-top: 2px;
  letter-spacing: 0.04em;
`;

const Tagline = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[2]};
  line-height: 1.6;
  padding: 10px 12px;
  background: ${({ theme }) => theme.bg[3]};
  border-radius: ${({ theme }) => theme.radius.default};
  margin-bottom: 14px;
  border-left: 2px solid ${({ theme }) => theme.ink[1]};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: ${({ theme }) => theme.line.faint};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.default};
  overflow: hidden;
`;

const StatCell = styled.div`
  background: ${({ theme }) => theme.bg[1]};
  padding: 8px 10px;
`;

const StatLabel = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.08em;
`;

const StatValue = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
  font-variant-numeric: tabular-nums;
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Chip = styled.span<{ $muted?: boolean }>`
  font-size: 10px;
  padding: 3px 8px;
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.chip};
  color: ${({ $muted, theme }) => ($muted ? theme.ink[2] : theme.ink[1])};
`;

const Actions = styled.div`
  margin-top: auto;
  padding: 14px 18px;
  border-top: 0.5px solid ${({ theme }) => theme.line.faint};
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const PrimaryAction = styled(Link)`
  width: 100%;
  font-family: inherit;
  font-size: 11px;
  padding: 8px;
  background: transparent;
  color: ${({ theme }) => theme.ink[1]};
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.default};
  letter-spacing: 0.04em;
  text-align: center;
  transition: border-color 0.12s ease;

  &:hover {
    border-color: rgba(143, 164, 194, 0.5);
  }

  &:focus-visible {
    outline: 1.5px solid ${({ theme }) => theme.ink[1]};
    outline-offset: 2px;
  }
`;

const GhostAction = styled.button`
  width: 100%;
  font-family: inherit;
  font-size: 11px;
  padding: 8px;
  background: transparent;
  color: ${({ theme }) => theme.ink[2]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.default};
  letter-spacing: 0.04em;
  transition: color 0.12s ease, border-color 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
  }
`;

type Props = {
  agent: Agent;
  extras: AgentExtras;
  parents: LineageParent[];
};

function pad2(n: number): string {
  return Math.max(0, Math.trunc(n)).toString().padStart(2, "0");
}

export default function AgentSidebar({ agent, extras, parents }: Props) {
  const label = labelFromAgent(agent);
  const visibleTraits = extras.traits.slice(0, TRAITS_VISIBLE);
  const overflow = Math.max(0, extras.traits.length - TRAITS_VISIBLE);

  return (
    <Aside>
      <Section>
        <Comment>{`// AGENT · ${extras.agentId}`}</Comment>
        <HeadRow>
          <AvatarWrap>
            <Avatar width="56" height="56" viewBox="0 0 48 48" aria-hidden>
              <rect width="48" height="48" fill="#0E1220" />
              <circle
                cx="24"
                cy="20"
                r="8"
                fill="none"
                stroke="#E8ECF1"
                strokeWidth="0.7"
              />
              <path
                d="M 12 38 Q 24 28 36 38"
                fill="none"
                stroke="#E8ECF1"
                strokeWidth="0.7"
              />
              <line
                x1="20"
                y1="18"
                x2="22"
                y2="20"
                stroke="#E8ECF1"
                strokeWidth="0.7"
              />
              <line
                x1="26"
                y1="18"
                x2="28"
                y2="20"
                stroke="#E8ECF1"
                strokeWidth="0.7"
              />
              <circle
                cx="24"
                cy="20"
                r="11"
                fill="none"
                stroke="#5DCAA5"
                strokeWidth="0.4"
                opacity="0.5"
              />
            </Avatar>
            <PresenceDot aria-hidden />
          </AvatarWrap>
          <HeadInfo>
            <Name>{agent.name.toLowerCase()}</Name>
            <Ens title={agent.ens}>{agent.ens}</Ens>
            <Status>listening · sealed</Status>
          </HeadInfo>
        </HeadRow>

        {agent.tagline && <Tagline>{agent.tagline}</Tagline>}

        <StatGrid>
          <StatCell>
            <StatLabel>GEN</StatLabel>
            <StatValue>{pad2(agent.generation)}</StatValue>
          </StatCell>
          <StatCell>
            <StatLabel>CHATS</StatLabel>
            <StatValue>{agent.chats.toLocaleString()}</StatValue>
          </StatCell>
          <StatCell>
            <StatLabel>MEMORIES</StatLabel>
            <StatValue>{extras.memoriesCount.toLocaleString()}</StatValue>
          </StatCell>
          <StatCell>
            <StatLabel>CHILDREN</StatLabel>
            <StatValue>{pad2(agent.children)}</StatValue>
          </StatCell>
        </StatGrid>
      </Section>

      <Section>
        <Comment>{"// TRAITS"}</Comment>
        <Chips>
          {visibleTraits.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
          {overflow > 0 && <Chip $muted>+{overflow}</Chip>}
        </Chips>
      </Section>

      <Section>
        <Comment>{"// LINEAGE"}</Comment>
        <LineageMini
          parents={parents}
          selfName={agent.name}
          selfGlyph={agent.glyph}
          childCount={agent.children}
        />
      </Section>

      <Section>
        <Comment>{"// PROVENANCE"}</Comment>
        <ProvenanceTable provenance={extras.provenance} />
      </Section>

      <Actions>
        <PrimaryAction href={`/breed?with=${label}`}>
          [ breed {label} → ]
        </PrimaryAction>
        <GhostAction
          type="button"
          onClick={() => console.log("[chat] view memory log:", label)}
        >
          view memory log
        </GhostAction>
      </Actions>
    </Aside>
  );
}
