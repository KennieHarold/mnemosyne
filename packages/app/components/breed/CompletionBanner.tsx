"use client";

import Link from "next/link";
import styled from "styled-components";
import type { Hex } from "viem";
import type { AgentIntelligence } from "@/lib/breed-events";

type Props = {
  child: AgentIntelligence;
  txHash: Hex | null;
  childTokenId: bigint | null;
  totalSeconds: number;
};

const Banner = styled.div`
  padding: 14px 28px;
  background: rgba(93, 202, 165, 0.05);
  border-top: 0.5px solid rgba(93, 202, 165, 0.3);
  border-bottom: 0.5px solid rgba(93, 202, 165, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.signal.live};
  box-shadow: 0 0 12px ${({ theme }) => theme.signal.live};
  flex-shrink: 0;
`;

const Texts = styled.div`
  min-width: 0;
`;

const Title = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.ink[1]};
  font-weight: 500;
`;

const Meta = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.ink[2]};
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChatCta = styled(Link)`
  font-family: inherit;
  font-size: 11px;
  padding: 9px 16px;
  background: ${({ theme }) => theme.cta.bg};
  color: ${({ theme }) => theme.cta.fg};
  border: none;
  border-radius: ${({ theme }) => theme.radius.default};
  letter-spacing: 0.04em;
  font-weight: 500;
  flex-shrink: 0;

  &:focus-visible {
    outline: 1.5px solid ${({ theme }) => theme.ink[1]};
    outline-offset: 2px;
  }
`;

function shortHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

export default function CompletionBanner({
  child,
  txHash,
  childTokenId,
  totalSeconds,
}: Props) {
  const ens = `${child.ensLabel}.mnemo.eth`;
  const tokenIdLabel = childTokenId !== null ? `#${childTokenId}` : "—";
  const txLabel = txHash ? shortHash(txHash) : "—";
  return (
    <Banner>
      <Left>
        <Dot />
        <Texts>
          <Title>{`${ens} has been minted`}</Title>
          <Meta>
            {`iNFT ${tokenIdLabel} · tx ${txLabel} · ceremony took ${totalSeconds.toFixed(1)}s`}
          </Meta>
        </Texts>
      </Left>
      <ChatCta href={`/chat/${child.ensLabel}`}>
        {`[ chat with ${child.displayName.toLowerCase()} → ]`}
      </ChatCta>
    </Banner>
  );
}
