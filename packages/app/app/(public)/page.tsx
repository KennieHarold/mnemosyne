"use client";

import { useMemo } from "react";
import Link from "next/link";
import styled from "styled-components";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import Starfield from "@/components/Starfield";
import { useAgents } from "@/hooks/useAgents";

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

const Hero = styled.section`
  position: relative;
  background: ${({ theme }) => theme.bg.base};
  background-image: radial-gradient(
    ellipse at 50% 30%,
    rgba(40, 60, 110, 0.25) 0%,
    transparent 60%
  );
  padding: 48px 40px 0;
  overflow: hidden;
`;

const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CommentHeader = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.2em;
  margin-bottom: 24px;
`;

const LogoWrap = styled.div`
  margin-bottom: 20px;
  display: inline-flex;
`;

const Headline = styled.h1`
  font-size: 30px;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.ink[1]};
  margin: 0 0 16px;
`;

const Subhead = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.ink[2]};
  line-height: 1.7;
  max-width: 440px;
  margin: 0 auto 24px;
`;

const CtaRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 36px;
  flex-wrap: wrap;
`;

const PrimaryCta = styled(Link)`
  background: ${({ theme }) => theme.cta.bg};
  color: ${({ theme }) => theme.cta.fg};
  border: none;
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 10px 18px;
  font-size: 11px;
  letter-spacing: 0.04em;
  font-weight: 500;
  font-family: inherit;
  display: inline-flex;
  align-items: center;

  &:focus-visible {
    outline: 1.5px solid ${({ theme }) => theme.ink[1]};
    outline-offset: 2px;
  }
`;

const SecondaryCta = styled(Link)`
  background: transparent;
  color: ${({ theme }) => theme.ink[1]};
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 10px 18px;
  font-size: 11px;
  letter-spacing: 0.04em;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.bg[1]};
  }

  &:focus-visible {
    border: 1.5px solid ${({ theme }) => theme.ink[1]};
    padding: 9.5px 17.5px;
  }
`;

const Features = styled.section`
  max-width: 600px;
  margin: 0 auto;
  padding: 0 40px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.article`
  background: rgba(20, 24, 34, 0.4);
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 16px;
`;

const CardComment = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.12em;
  margin-bottom: 8px;
`;

const CardLabel = styled.h2`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
  margin: 0 0 6px;
  letter-spacing: 0.01em;
`;

const CardBody = styled.p`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  line-height: 1.6;
  margin: 0;
`;

const StatStrip = styled.div`
  max-width: 600px;
  margin: 24px auto 0;
  padding: 16px 40px 20px;
  border-top: 0.5px solid ${({ theme }) => theme.line.faint};
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Stat = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[4]};
  letter-spacing: 0.1em;
`;

const FEATURES = [
  {
    n: "01",
    label: "genesis",
    body: "One sentence becomes a character with name, traits, ENS subname, and an iNFT.",
  },
  {
    n: "02",
    label: "memory",
    body: "Sealed inference. Encrypted reflections. Tomorrow's agent remembers today.",
  },
  {
    n: "03",
    label: "lineage",
    body: "Breed two agents. The child inherits both. Royalties flow up forever.",
  },
];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function Landing() {
  const { agents, isLoading, isError } = useAgents();
  const stats = useMemo(() => {
    let maxGen = 0;
    for (const a of agents) {
      if (a.generation > maxGen) maxGen = a.generation;
    }
    return {
      minted: agents.length,
      generations: agents.length > 0 ? maxGen + 1 : 0,
    };
  }, [agents]);

  const showLive = !isLoading && !isError;
  const mintedLabel = showLive ? `${pad2(stats.minted)} agents minted` : "agents minted";
  const generationsLabel = showLive
    ? `${pad2(stats.generations)} generations live`
    : "generations live";

  return (
    <Page>
      <Header />
      <Main>
        <Hero>
          <Starfield />
          <HeroInner>
            <CommentHeader>{"// PROTOCOL · 0G iNFT · ERC-7857"}</CommentHeader>
            <LogoWrap>
              <Logo size={64} decorative />
            </LogoWrap>
            <Headline>
              Memory bound across
              <br />
              generations.
            </Headline>
            <Subhead>
              AI agents you mint, own, and breed. Every conversation accrues
              memory.
              <br />
              Every descendant pays royalties up the lineage.
            </Subhead>
            <CtaRow>
              <PrimaryCta href="/mint">[ mint a genesis agent → ]</PrimaryCta>
              <SecondaryCta href="/tree">explore tree</SecondaryCta>
            </CtaRow>
          </HeroInner>
        </Hero>
        <Features>
          {FEATURES.map((f) => (
            <Card key={f.n}>
              <CardComment>{`// ${f.n}`}</CardComment>
              <CardLabel>{f.label}</CardLabel>
              <CardBody>{f.body}</CardBody>
            </Card>
          ))}
        </Features>
        <StatStrip>
          <Stat>{mintedLabel}</Stat>
          <Stat>{generationsLabel}</Stat>
          <Stat>00G royalties paid</Stat>
        </StatStrip>
      </Main>
      <Footer />
    </Page>
  );
}
