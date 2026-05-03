"use client";

import { ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Address, formatUnits } from "viem";
import { useBalance, useConnection, useGasPrice } from "wagmi";
import ConnectButton from "./ConnectButton";
import Logo from "./Logo";

const Bar = styled.header`
  height: 56px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.default};
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 20px;
  background: ${({ theme }) => theme.bg.base};
  position: relative;
  z-index: 2;
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.ink[1]};
  width: fit-content;

  &:focus-visible {
    outline: 1.5px solid ${({ theme }) => theme.ink[1]};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radius.default};
  }
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
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: 3px;
  padding: 2px 6px;
  letter-spacing: 0.04em;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const NavLink = styled(Link)`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[3]};
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.default};
  letter-spacing: 0.02em;
  transition: color 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
  }

  &:focus-visible {
    border: 1.5px solid ${({ theme }) => theme.ink[1]};
    padding: 4.5px 8.5px;
  }
`;

const NavSep = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.ink[4]};
  user-select: none;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
`;

const StatGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Stat = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 10px;
  letter-spacing: 0.04em;
`;

const StatLabel = styled.span`
  color: ${({ theme }) => theme.ink[4]};
  text-transform: uppercase;
`;

const StatValue = styled.span`
  color: ${({ theme }) => theme.ink[2]};
  font-variant-numeric: tabular-nums;
`;

const StatUnit = styled.span`
  color: ${({ theme }) => theme.ink[3]};
`;

const Divider = styled.span`
  width: 1px;
  height: 14px;
  background: ${({ theme }) => theme.line.default};
`;

function formatBalance(value: bigint, decimals: number) {
  const raw = Number(formatUnits(value, decimals));
  if (!Number.isFinite(raw)) return "0";
  if (raw === 0) return "0";
  if (raw < 0.0001) return raw.toExponential(2);
  if (raw < 1) return raw.toFixed(4);
  if (raw < 1000) return raw.toFixed(3);
  return raw.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatNeuros(weiPerGas: bigint) {
  const neuros = Number(formatUnits(weiPerGas, 9));
  if (!Number.isFinite(neuros) || neuros === 0) return "0";
  if (neuros < 0.01) return neuros.toFixed(4);
  if (neuros < 1) return neuros.toFixed(3);
  return neuros.toFixed(2);
}

function GasPriceStat() {
  const { data, isPending } = useGasPrice({
    query: { refetchInterval: 12_000 },
  });
  return (
    <Stat>
      <StatLabel>gas</StatLabel>
      <StatValue>{isPending || !data ? "—" : formatNeuros(data)}</StatValue>
      <StatUnit>neuros</StatUnit>
    </Stat>
  );
}

function BalanceStat({ address }: { address: Address }) {
  const { data, isPending } = useBalance({
    address,
    query: { refetchInterval: 15_000 },
  });

  return (
    <Stat>
      <StatLabel>bal</StatLabel>
      <StatValue>
        {isPending || !data ? "—" : formatBalance(data.value, data.decimals)}
      </StatValue>
      <StatUnit>{data?.symbol ?? "0G"}</StatUnit>
    </Stat>
  );
}

type HeaderProps = {
  breadcrumb?: ReactNode;
};

export default function Header({ breadcrumb }: HeaderProps = {}) {
  const { address, isConnected } = useConnection();

  return (
    <Bar>
      <Brand href="/" aria-label="Go to landing page">
        <Logo size={22} alt="Mnemo" />
        <Wordmark>MNEMO</Wordmark>
        <VersionChip>v1.0.0</VersionChip>
      </Brand>
      {breadcrumb ?? (
        <Nav aria-label="Primary">
          <NavLink href="/directory">directory</NavLink>
          <NavSep>·</NavSep>
          <NavLink href="/tree">tree</NavLink>
          <NavSep>·</NavSep>
          <NavLink href="/mint">mint</NavLink>
          <NavSep>·</NavSep>
          <NavLink href="/breed">breed</NavLink>
          {/* <NavSep>·</NavSep>
          <NavLink href="/royalties">royalties</NavLink> */}
        </Nav>
      )}
      <Right>
        {isConnected && address && (
          <>
            <StatGroup>
              <BalanceStat address={address} />
              <GasPriceStat />
            </StatGroup>
            <Divider aria-hidden />
          </>
        )}
        <ConnectButton />
      </Right>
    </Bar>
  );
}
