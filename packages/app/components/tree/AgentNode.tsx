"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import styled from "styled-components";
import type { Agent } from "@/lib/agent";

const NODE_R = 14;

export type AgentNodeData = {
  agent: Agent;
  selected: boolean;
};

const Wrap = styled.div`
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
`;

const NodeLabel = styled.div`
  position: absolute;
  top: calc(50% + 18px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: ${({ theme }) => theme.ink[2]};
  white-space: nowrap;
  font-family: ${({ theme }) => theme.font.mono};
  letter-spacing: 0.02em;
  pointer-events: none;
`;

const HiddenHandle = styled(Handle)`
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
  border: 0;
  background: transparent;
`;

function AgentNodeImpl({ data }: NodeProps) {
  const { agent, selected } = data as AgentNodeData;
  const fill = selected ? "#E8ECF1" : "#0E1220";
  const glyphColor = selected ? "#07080C" : "#E8ECF1";

  return (
    <Wrap>
      <HiddenHandle type="target" position={Position.Top} isConnectable={false} />
      <svg
        width="56"
        height="56"
        viewBox="-28 -28 56 56"
        style={{ overflow: "visible" }}
      >
        {selected && (
          <circle
            r={NODE_R}
            fill="none"
            stroke="#5DCAA5"
            strokeWidth="0.5"
            opacity="0.8"
          >
            <animate
              attributeName="r"
              values={`${NODE_R};${NODE_R + 8};${NODE_R}`}
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.8;0;0.8"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}
        <circle
          r={NODE_R}
          fill={fill}
          stroke="rgba(120, 140, 180, 0.25)"
          strokeWidth="0.5"
        />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize="11"
          fill={glyphColor}
        >
          {agent.glyph}
        </text>
      </svg>
      <NodeLabel>{agent.name.toLowerCase().split(" ")[0]}</NodeLabel>
      <HiddenHandle type="source" position={Position.Bottom} isConnectable={false} />
    </Wrap>
  );
}

export const AgentNode = memo(AgentNodeImpl);
