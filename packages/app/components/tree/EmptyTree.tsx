"use client";

import Link from "next/link";
import styled from "styled-components";
import Logo from "@/components/Logo";

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 320px;
  padding: 24px;
  pointer-events: auto;
`;

const Title = styled.h3`
  margin: 12px 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.ink[1]};
  letter-spacing: 0.01em;
`;

const Body = styled.p`
  margin: 0 0 18px;
  font-size: 11px;
  line-height: 1.6;
  color: ${({ theme }) => theme.ink[2]};
  max-width: 280px;
`;

const Cta = styled(Link)`
  background: ${({ theme }) => theme.cta.bg};
  color: ${({ theme }) => theme.cta.fg};
  border: none;
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 9px 16px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  font-family: ${({ theme }) => theme.font.mono};
`;

export default function EmptyTree() {
  return (
    <Wrap>
      <Card>
        <Logo size={32} decorative />
        <Title>No agents yet</Title>
        <Body>
          Mint your first agent to start a lineage. Every conversation it has
          accrues memory. Every descendant pays you royalties.
        </Body>
        <Cta href="/mint">[ mint a genesis agent → ]</Cta>
      </Card>
    </Wrap>
  );
}
