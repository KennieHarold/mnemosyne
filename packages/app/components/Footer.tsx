"use client";

import styled from "styled-components";
import VisuallyHidden from "./VisuallyHidden";

const Bar = styled.footer`
  border-top: 0.5px solid ${({ theme }) => theme.line.default};
  background: ${({ theme }) => theme.bg[1]};
  padding: 8px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  color: ${({ theme }) => theme.ink[4]};
  letter-spacing: 0.08em;
`;

const Side = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

export default function Footer() {
  return (
    <Bar>
      <Side>0g·chain · base·sepolia · ens · sealed inference</Side>
      <Side>
        block 0x4a72e1 · 12s ago · <span aria-hidden>🪢</span>
        <VisuallyHidden>Mnemo</VisuallyHidden>
      </Side>
    </Bar>
  );
}
