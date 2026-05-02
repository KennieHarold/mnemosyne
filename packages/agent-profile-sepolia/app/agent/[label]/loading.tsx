"use client";

import styled, { keyframes } from "styled-components";

const shimmer = keyframes`
  0% { opacity: 0.45; }
  50% { opacity: 0.85; }
  100% { opacity: 0.45; }
`;

const Wrap = styled.div`
  padding: 24px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 880px;
  width: 100%;
  margin: 0 auto;
`;

const Comment = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  letter-spacing: 0.08em;
`;

const Hero = styled.section`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
`;

const Glyph = styled.div`
  width: 56px;
  height: 56px;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.default};
  background: ${({ theme }) => theme.bg[2]};
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

const HeroText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`;

const Bar = styled.div<{ $w: string; $h?: string }>`
  width: ${(p) => p.$w};
  height: ${(p) => p.$h ?? "10px"};
  background: ${({ theme }) => theme.bg[2]};
  border-radius: 3px;
  animation: ${shimmer} 1.4s ease-in-out infinite;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: ${({ theme }) => theme.line.faint};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  overflow: hidden;
`;

const StatCell = styled.div`
  background: ${({ theme }) => theme.bg[1]};
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 60px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export default function Loading() {
  return (
    <Wrap>
      <Comment>{"// AGENT · RESOLVING ENS RECORDS…"}</Comment>
      <Hero>
        <Glyph />
        <HeroText>
          <Bar $w="160px" $h="22px" />
          <Bar $w="120px" />
          <Bar $w="200px" $h="9px" />
        </HeroText>
      </Hero>
      <StatGrid>
        <StatCell>
          <Bar $w="40%" $h="9px" />
          <Bar $w="60%" $h="16px" />
        </StatCell>
        <StatCell>
          <Bar $w="40%" $h="9px" />
          <Bar $w="60%" $h="16px" />
        </StatCell>
        <StatCell>
          <Bar $w="40%" $h="9px" />
          <Bar $w="60%" $h="16px" />
        </StatCell>
        <StatCell>
          <Bar $w="40%" $h="9px" />
          <Bar $w="60%" $h="16px" />
        </StatCell>
      </StatGrid>
      <Card>
        <Bar $w="80%" />
        <Bar $w="65%" />
        <Bar $w="70%" />
        <Bar $w="55%" />
      </Card>
    </Wrap>
  );
}
