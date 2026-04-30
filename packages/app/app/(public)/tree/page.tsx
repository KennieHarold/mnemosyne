"use client";

import { useMemo } from "react";
import styled from "styled-components";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TreeCanvas from "@/components/tree/TreeCanvas";
import { useAgents } from "@/hooks/useAgents";
import type { Agent } from "@/lib/agent";

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
`;

const TreeHeader = styled.header`
  padding: 16px 20px 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
`;

const TitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Comment = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
`;

const Heading = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.ink[1]};
`;

const Stats = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
`;

const Caret = styled.span`
  display: inline-block;
  width: 7px;
  height: 11px;
  background: ${({ theme }) => theme.ink[2]};
  vertical-align: -1px;
  margin-left: 2px;
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
  let maxGen = 0;
  let active24h = 0;
  for (const a of agents) {
    if (a.generation > maxGen) maxGen = a.generation;
    if (a.chats > 1500) active24h += 1;
  }
  return {
    nodes: agents.length,
    generations: maxGen,
    active24h,
  };
}

export default function TreePage() {
  const { agents, isLoading, isError } = useAgents();
  const stats = useMemo(() => summarize(agents), [agents]);

  return (
    <Page>
      <Header />
      <Main>
        <TreeHeader>
          <TitleStack>
            <Comment>{"// LINEAGE REGISTRY"}</Comment>
            <Heading>Family tree</Heading>
          </TitleStack>
          <Stats>
            {isLoading ? (
              <>
                reading lineage
                <Caret />
              </>
            ) : isError ? (
              <span>could not read lineage</span>
            ) : (
              <>
                nodes {pad2(stats.nodes)} · generations{" "}
                {pad2(stats.generations)} · active·24h {pad2(stats.active24h)}
              </>
            )}
          </Stats>
        </TreeHeader>
        <TreeCanvas agents={agents} isLoading={isLoading} />
      </Main>
      <Footer />
    </Page>
  );
}
