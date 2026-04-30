"use client";

import Link from "next/link";
import styled from "styled-components";
import Logo from "./Logo";

const Bar = styled.header`
  height: 56px;
  border-bottom: 0.5px solid ${({ theme }) => theme.line.default};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: ${({ theme }) => theme.bg.base};
  position: relative;
  z-index: 2;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.ink[1]};
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

const ConnectButton = styled.button`
  font-family: inherit;
  font-size: 11px;
  color: ${({ theme }) => theme.ink[1]};
  background: transparent;
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 6px 12px;
  letter-spacing: 0.02em;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.bg[1]};
  }

  &:focus-visible {
    border: 1.5px solid ${({ theme }) => theme.ink[1]};
    padding: 4.5px 10.5px;
  }
`;

export default function Header() {
  return (
    <Bar>
      <Brand>
        <Logo size={22} alt="Mnemo" />
        <Wordmark>MNEMO</Wordmark>
        <VersionChip>v1.0.0</VersionChip>
      </Brand>
      <Nav aria-label="Primary">
        <NavLink href="/directory">directory</NavLink>
        <NavSep>·</NavSep>
        <NavLink href="/tree">tree</NavLink>
        <NavSep>·</NavSep>
        <NavLink href="/docs">docs</NavLink>
      </Nav>
      <ConnectButton type="button">[ connect wallet → ]</ConnectButton>
    </Bar>
  );
}
