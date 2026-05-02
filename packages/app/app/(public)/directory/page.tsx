"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { useConnection } from "wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AgentCard from "@/components/directory/AgentCard";
import { useAgents } from "@/hooks/useAgents";
import { labelFromAgent, type Agent } from "@/lib/agent";

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
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SectionHeader = styled.header`
  padding: 18px 24px 14px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.faint};
`;

const TitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Comment = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.16em;
`;

const Heading = styled.h1`
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
  letter-spacing: -0.005em;
`;

const Stats = styled.div`
  display: flex;
  gap: 18px;
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
`;

const StatValue = styled.span`
  color: ${({ theme }) => theme.ink[1]};
  margin-left: 4px;
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: ${({ theme }) => theme.bg.base};
  background-image:
    linear-gradient(rgba(120, 140, 180, 0.04) 0.5px, transparent 0.5px),
    linear-gradient(90deg, rgba(120, 140, 180, 0.04) 0.5px, transparent 0.5px);
  background-size: 24px 24px;
`;

const Grid = styled.div`
  padding: 18px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
`;

const Footnote = styled.div`
  padding: 16px 24px 22px;
  text-align: center;
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.08em;
`;

const StatusRow = styled.div`
  padding: 80px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
`;

const StatusTitle = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.ink[1]};
`;

const StatusBody = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[2]};
  max-width: 320px;
  line-height: 1.6;
`;

const Caret = styled.span`
  display: inline-block;
  width: 6px;
  height: 11px;
  background: ${({ theme }) => theme.ink[2]};
  vertical-align: -1px;
  margin-left: 4px;
  animation: blink 1s steps(2) infinite;

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
`;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function summarize(agents: Agent[]) {
  let active24h = 0;
  let bred24h = 0;
  for (const a of agents) {
    if (a.children > 0) bred24h += 1;
    if (a.chats > 1500 || a.children > 0) active24h += 1;
  }
  return {
    total: agents.length,
    active24h,
    bred24h,
  };
}

export default function DirectoryPage() {
  const { agents, isLoading, isError } = useAgents();
  const { address } = useConnection();
  const router = useRouter();

  const stats = useMemo(() => summarize(agents), [agents]);

  const handleAgentClick = useCallback(
    (agent: Agent) => {
      const label = labelFromAgent(agent);
      if (!label) return;
      router.push(`/chat/${label}`);
    },
    [router],
  );

  const ownerLower = address?.toLowerCase();

  return (
    <Page>
      <Header />
      <Main>
        <SectionHeader>
          <TitleStack>
            <Comment>{"// AGENT REGISTRY"}</Comment>
            <Heading>Directory</Heading>
          </TitleStack>
          <Stats>
            <span>
              total<StatValue>{pad2(stats.total)}</StatValue>
            </span>
            <span>
              active·24h<StatValue>{pad2(stats.active24h)}</StatValue>
            </span>
            <span>
              bred·24h<StatValue>{pad2(stats.bred24h)}</StatValue>
            </span>
          </Stats>
        </SectionHeader>
        <Scroll>
          {isLoading && agents.length === 0 ? (
            <StatusRow role="status">
              <StatusTitle>
                reading registry
                <Caret />
              </StatusTitle>
              <StatusBody>fetching minted agents from the 0G chain.</StatusBody>
            </StatusRow>
          ) : isError ? (
            <StatusRow role="status">
              <StatusTitle>could not read registry</StatusTitle>
              <StatusBody>
                the rpc returned an error. try refreshing in a moment.
              </StatusBody>
            </StatusRow>
          ) : agents.length === 0 ? (
            <StatusRow role="status">
              <StatusTitle>no agents minted yet</StatusTitle>
              <StatusBody>
                the registry is empty. mint a genesis agent to start a lineage.
              </StatusBody>
            </StatusRow>
          ) : (
            <>
              <Grid>
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.tokenId.toString()}
                    agent={agent}
                    isMine={
                      ownerLower !== undefined &&
                      agent.owner.toLowerCase() === ownerLower
                    }
                    onClick={() => handleAgentClick(agent)}
                  />
                ))}
              </Grid>
              <Footnote>
                showing {agents.length} of {agents.length} · click any agent to
                chat
              </Footnote>
            </>
          )}
        </Scroll>
      </Main>
      <Footer />
    </Page>
  );
}
