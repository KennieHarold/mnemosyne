"use client";

import styled from "styled-components";
import Link from "next/link";

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.bg.base};
  color: ${({ theme }) => theme.ink[1]};
`;

const Header = styled.header`
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.default};
  background: ${({ theme }) => theme.bg.base};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const BrandLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Wordmark = styled.span`
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.ink[1]};
`;

const VersionChip = styled.span`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[3]};
  padding: 2px 6px;
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: ${({ theme }) => theme.radius.chip};
`;

const HeaderSpacer = styled.div`
  flex: 1;
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[2]};
  padding: 4px 8px;
  border: 0.5px solid ${({ theme }) => theme.line.default};
  border-radius: 999px;
  letter-spacing: 0.04em;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.signal.live};
  box-shadow: 0 0 6px ${({ theme }) => theme.signal.live};
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Footer = styled.footer`
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-top: 0.5px solid ${({ theme }) => theme.line.default};
  font-size: 9px;
  color: ${({ theme }) => theme.ink[4]};
`;

function Knot() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="4.5" cy="7" r="3" stroke="#E8ECF1" strokeWidth="0.6" />
      <circle cx="9.5" cy="7" r="3" stroke="#E8ECF1" strokeWidth="0.6" />
    </svg>
  );
}

export default function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <Header>
        <BrandLink href="/">
          <Knot />
          <Wordmark>MNEMO</Wordmark>
          <VersionChip>v1.0.0</VersionChip>
        </BrandLink>
        <HeaderSpacer />
        <StatusPill>
          <Dot />
          ens · sepolia
        </StatusPill>
      </Header>
      <Main>{children}</Main>
      <Footer>
        <span>{"// resolver · mnemo.eth · sepolia"}</span>
        <span>ens text records · 🪢</span>
      </Footer>
    </Shell>
  );
}
