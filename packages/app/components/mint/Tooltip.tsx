"use client";

import { useState } from "react";
import styled from "styled-components";

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const Trigger = styled.button`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  background: transparent;
  color: ${({ theme }) => theme.ink[3]};
  font-family: inherit;
  font-size: 9px;
  line-height: 1;
  cursor: help;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition:
    color 0.12s ease,
    border-color 0.12s ease;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.ink[1]};
    border-color: ${({ theme }) => theme.line.strong};
  }
`;

const Bubble = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.card};
  padding: 8px 10px;
  font-size: 10px;
  line-height: 1.5;
  color: ${({ theme }) => theme.ink[2]};
  letter-spacing: 0;
  text-transform: none;
  text-align: left;
  z-index: 8;
  pointer-events: none;
`;

type Props = {
  content: React.ReactNode;
  ariaLabel?: string;
};

export default function Tooltip({ content, ariaLabel = "more info" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Wrap>
      <Trigger
        type="button"
        aria-label={ariaLabel}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        ?
      </Trigger>
      {open && <Bubble role="tooltip">{content}</Bubble>}
    </Wrap>
  );
}
