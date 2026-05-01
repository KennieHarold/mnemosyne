"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import styled from "styled-components";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumb from "@/components/Breadcrumb";
import AgentSidebar from "@/components/chat/AgentSidebar";
import ChatPanel from "@/components/chat/ChatPanel";
import { useAgents } from "@/hooks/useAgents";
import { labelFromAgent, type Agent } from "@/lib/agent";
import {
  getAgentExtras,
  getIntroMessage,
  getSuggestions,
  resolveLineageParents,
} from "@/lib/chat";

const Page = styled.div`
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg.base};
  overflow: hidden;
`;

const Main = styled.main`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px 1fr;
`;

const SkeletonSide = styled.div`
  border-right: 0.5px solid ${({ theme }) => theme.line.default};
  background: rgba(10, 12, 18, 0.6);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const SkeletonBlock = styled.div<{ $h: number }>`
  height: ${({ $h }) => $h}px;
  border: 0.5px solid ${({ theme }) => theme.line.faint};
  border-radius: ${({ theme }) => theme.radius.default};
`;

const SkeletonChat = styled.div`
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Empty = styled.div`
  grid-column: 1 / -1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 40px;
  text-align: center;
`;

const EmptyTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.ink[1]};
`;

const EmptyBody = styled.p`
  margin: 0;
  max-width: 320px;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.ink[2]};
`;

const BackLink = styled(Link)`
  font-size: 11px;
  padding: 8px 14px;
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.default};
  color: ${({ theme }) => theme.ink[1]};
  letter-spacing: 0.04em;
  transition: border-color 0.12s ease;

  &:hover {
    border-color: ${({ theme }) => theme.ink[2]};
  }
`;

type Props = {
  params: Promise<{ label: string }>;
};

export default function ChatPage({ params }: Props) {
  const { label } = use(params);
  const { agents, isLoading } = useAgents();

  const agent: Agent | null = useMemo(
    () => agents.find((a) => labelFromAgent(a) === label) ?? null,
    [agents, label],
  );

  const extras = useMemo(() => getAgentExtras(label), [label]);
  const parents = useMemo(
    () => (agent ? resolveLineageParents(agent, agents) : []),
    [agent, agents],
  );
  const initialMessages = useMemo(() => [getIntroMessage(label)], [label]);
  const suggestions = useMemo(() => getSuggestions(), []);

  if (!agent) {
    if (isLoading) {
      return (
        <Page>
          <Header breadcrumb={<Breadcrumb leaf={`${label}.mnemo.eth`} />} />
          <Main>
            <SkeletonSide aria-hidden>
              <SkeletonBlock $h={56} />
              <SkeletonBlock $h={56} />
              <SkeletonBlock $h={70} />
              <SkeletonBlock $h={86} />
              <SkeletonBlock $h={120} />
            </SkeletonSide>
            <SkeletonChat aria-hidden>
              <SkeletonBlock $h={20} />
              <SkeletonBlock $h={40} />
              <SkeletonBlock $h={64} />
              <SkeletonBlock $h={40} />
            </SkeletonChat>
          </Main>
          <Footer />
        </Page>
      );
    }
    return (
      <Page>
        <Header breadcrumb={<Breadcrumb leaf={`${label}.mnemo.eth`} />} />
        <Main>
          <Empty role="status">
            <EmptyTitle>no agent at this label</EmptyTitle>
            <EmptyBody>
              {label}.mnemo.eth has no record on the registry. The agent may
              not have been minted yet.
            </EmptyBody>
            <BackLink href="/tree">[ back to tree → ]</BackLink>
          </Empty>
        </Main>
        <Footer />
      </Page>
    );
  }

  return (
    <Page>
      <Header breadcrumb={<Breadcrumb leaf={agent.ens} />} />
      <Main>
        <AgentSidebar agent={agent} extras={extras} parents={parents} />
        <ChatPanel
          label={label}
          initialMessages={initialMessages}
          suggestions={suggestions}
          sessionId={extras.sessionId}
          sessionOpenedAt={extras.sessionOpenedAt}
          initialMemoriesWritten={extras.memoriesWritten}
        />
      </Main>
      <Footer />
    </Page>
  );
}
