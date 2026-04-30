"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import styled from "styled-components";

export type RulerNodeData = {
  label: string;
  width: number;
};

const Wrap = styled.div`
  position: relative;
  pointer-events: none;
  user-select: none;
`;

const Label = styled.span`
  position: absolute;
  left: 0;
  top: -5px;
  font-size: 8px;
  color: ${({ theme }) => theme.ink[4]};
  font-family: ${({ theme }) => theme.font.mono};
  letter-spacing: 0.04em;
`;

const Line = styled.div<{ $width: number }>`
  position: absolute;
  top: 0;
  left: 40px;
  width: ${({ $width }) => $width - 40}px;
  height: 0.5px;
  background-image: linear-gradient(
    to right,
    rgba(120, 140, 180, 0.18) 0,
    rgba(120, 140, 180, 0.18) 2px,
    transparent 2px,
    transparent 6px
  );
  background-size: 6px 0.5px;
  background-repeat: repeat-x;
`;

function RulerNodeImpl({ data }: NodeProps) {
  const { label, width } = data as RulerNodeData;
  return (
    <Wrap style={{ width }}>
      <Label>{label}</Label>
      <Line $width={width} />
    </Wrap>
  );
}

export const RulerNode = memo(RulerNodeImpl);
