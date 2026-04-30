"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
} from "wagmi";
import { shorten } from "@/lib/utils";

const Wrap = styled.div`
  position: relative;
`;

const Button = styled.button`
  font-family: inherit;
  font-size: 11px;
  color: ${({ theme }) => theme.ink[1]};
  background: transparent;
  border: 0.5px solid ${({ theme }) => theme.line.strong};
  border-radius: ${({ theme }) => theme.radius.default};
  padding: 6px 12px;
  letter-spacing: 0.02em;
  transition: background 0.12s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.bg[1]};
  }

  &:focus-visible {
    border: 1.5px solid ${({ theme }) => theme.ink[1]};
    padding: 4.5px 10.5px;
  }

  &:disabled {
    color: ${({ theme }) => theme.ink[3]};
    cursor: not-allowed;
  }
`;

const Dot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ theme }) => theme.signal.live};
  box-shadow: 0 0 6px ${({ theme }) => theme.signal.live};
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.modal};
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 5;
`;

const MenuLabel = styled.div`
  font-size: 9px;
  color: ${({ theme }) => theme.ink[4]};
  padding: 6px 10px 4px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const MenuItem = styled.button`
  font-family: inherit;
  font-size: 11px;
  color: ${({ theme }) => theme.ink[2]};
  background: transparent;
  border: 0;
  padding: 8px 10px;
  text-align: left;
  border-radius: ${({ theme }) => theme.radius.default};
  letter-spacing: 0.02em;
  transition: color 0.12s ease, background 0.12s ease;

  &:hover {
    color: ${({ theme }) => theme.ink[1]};
    background: ${({ theme }) => theme.bg[2]};
  }
`;

export default function ConnectButton() {
  const { address, isConnected, isConnecting, isReconnecting } =
    useConnection();
  const { mutate: connect, isPending } = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const connectors = useConnectors();
  const injected = connectors.find((c) => c.id === "injected");

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (isConnecting || isReconnecting) {
    return <Button disabled>connecting…</Button>;
  }

  if (isConnected && address) {
    return (
      <Wrap ref={wrapRef}>
        <Button type="button" onClick={() => setOpen((v) => !v)}>
          <Dot />
          {shorten(address)}
        </Button>
        {open && (
          <Menu role="menu">
            <MenuLabel>wallet</MenuLabel>
            <MenuItem
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(address);
                setOpen(false);
              }}
            >
              copy address
            </MenuItem>
            <MenuItem
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              disconnect →
            </MenuItem>
          </Menu>
        )}
      </Wrap>
    );
  }

  return (
    <Button
      type="button"
      onClick={() => injected && connect({ connector: injected })}
      disabled={isPending || !injected}
    >
      {isPending ? "connecting…" : "[ connect wallet → ]"}
    </Button>
  );
}
