"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import styled from "styled-components";
import { TOTAL_GENERATIONS, type Agent } from "@/lib/agent";
import { AgentNode, type AgentNodeData } from "./AgentNode";
import { RulerNode, type RulerNodeData } from "./RulerNode";
import HoverCard, { HOVER_W } from "./HoverCard";
import ZoomControls from "./ZoomControls";
import EmptyTree from "./EmptyTree";

const NODE_SIZE = 56;
const RULER_WIDTH = 1400;

const Frame = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  background: ${({ theme }) => theme.bg.base};
  background-image: linear-gradient(
      rgba(120, 140, 180, 0.07) 0.5px,
      transparent 0.5px
    ),
    linear-gradient(
      90deg,
      rgba(120, 140, 180, 0.07) 0.5px,
      transparent 0.5px
    );
  background-size: 24px 24px;
  border-top: 0.5px solid ${({ theme }) => theme.line.default};
  overflow: hidden;

  /* React Flow hardcodes 1px attribution-pane and selection-rect borders;
     suppress them to honor the 0.5px hairline rule. */
  .react-flow__attribution {
    display: none;
  }
  .react-flow__panel {
    margin: 0;
  }
  .react-flow__edge-path {
    stroke-linecap: round;
  }
  .react-flow__handle {
    opacity: 0;
    pointer-events: none;
  }
`;

const HoverHost = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 25;
`;

const Hint = styled.div`
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  background: ${({ theme }) => theme.bg[1]};
  border: 0.5px solid ${({ theme }) => theme.line.medium};
  border-radius: ${({ theme }) => theme.radius.default};
  font-size: 9px;
  color: ${({ theme }) => theme.ink[2]};
  letter-spacing: 0.08em;
  pointer-events: none;
  z-index: 20;
`;

const NODE_TYPES = {
  agent: AgentNode,
  ruler: RulerNode,
};

type HoverState = {
  agent: Agent;
  left: number;
  top: number;
} | null;

function generationY(gen: number): number {
  return gen * 60 + 40;
}

function jitter(tokenId: bigint, span: number): number {
  const id = Number(tokenId);
  const h = (id * 2654435761) >>> 0;
  return ((h % 1000) / 1000) * span - span / 2;
}

function buildLayout(agents: Agent[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const byGen = new Map<number, Agent[]>();
  for (const a of agents) {
    const list = byGen.get(a.generation) ?? [];
    list.push(a);
    byGen.set(a.generation, list);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const nodes: Node[] = [];

  for (let gen = 1; gen <= TOTAL_GENERATIONS; gen++) {
    nodes.push({
      id: `ruler-${gen}`,
      type: "ruler",
      position: { x: 0, y: generationY(gen) - 26 },
      data: {
        label: `gen ${String(gen).padStart(2, "0")}`,
        width: RULER_WIDTH,
      } satisfies RulerNodeData,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
    });
  }

  for (const [gen, list] of byGen.entries()) {
    list.sort((a, b) => Number(a.tokenId - b.tokenId));
    const count = list.length;
    const spacing = count > 1 ? Math.min(120, (RULER_WIDTH - 120) / (count - 1)) : 0;
    const totalSpan = spacing * (count - 1);
    const startX = 80 + (RULER_WIDTH - 160 - totalSpan) / 2;
    const baseY = generationY(gen);

    list.forEach((agent, idx) => {
      const x = startX + idx * spacing + jitter(agent.tokenId, 14);
      const y = baseY + jitter(agent.tokenId + BigInt(7), 8);
      positions.set(agent.tokenId.toString(), { x, y });
      nodes.push({
        id: agent.tokenId.toString(),
        type: "agent",
        position: { x: x - NODE_SIZE / 2, y: y - NODE_SIZE / 2 },
        data: { agent, selected: false } satisfies AgentNodeData,
        draggable: false,
        zIndex: 2,
        width: NODE_SIZE,
        height: NODE_SIZE,
      });
    });
  }

  const edges: Edge[] = [];
  for (const a of agents) {
    if (!a.parentIds) continue;
    for (const pid of a.parentIds) {
      const sourceKey = pid.toString();
      const targetKey = a.tokenId.toString();
      if (!positions.has(sourceKey)) continue;
      edges.push({
        id: `${sourceKey}->${targetKey}`,
        source: sourceKey,
        target: targetKey,
        type: "default",
        style: {
          stroke: "rgba(143, 164, 194, 0.4)",
          strokeWidth: 0.5,
          fill: "none",
        },
      });
    }
  }

  return { nodes, edges };
}

type Props = {
  agents: Agent[];
  isLoading: boolean;
  onAgentClick?: (agent: Agent) => void;
};

function TreeCanvasInner({ agents, isLoading, onAgentClick }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reactFlow = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const layout = useMemo(() => buildLayout(agents), [agents]);

  const agentBounds = useMemo(() => {
    if (agents.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of layout.nodes) {
      if (node.type !== "agent") continue;
      const w = node.width ?? NODE_SIZE;
      const h = node.height ?? NODE_SIZE;
      const { x, y } = node.position;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }
    if (!Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY };
  }, [agents.length, layout.nodes]);

  const fitToAgents = useCallback(
    (duration: number) => {
      const frame = frameRef.current;
      if (!frame || !agentBounds) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const padding = 0.15;
      const contentW = Math.max(1, agentBounds.maxX - agentBounds.minX);
      const contentH = Math.max(1, agentBounds.maxY - agentBounds.minY);
      const zoomX = (rect.width * (1 - padding * 2)) / contentW;
      const zoomY = (rect.height * (1 - padding * 2)) / contentH;
      const zoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.4), 2);

      const cx = (agentBounds.minX + agentBounds.maxX) / 2;
      const cy = (agentBounds.minY + agentBounds.maxY) / 2;

      reactFlow.setCenter(cx, cy, { zoom, duration });
    },
    [agentBounds, reactFlow],
  );

  useEffect(() => {
    if (!nodesInitialized || !agentBounds) return;
    const frame = frameRef.current;
    if (!frame) return;

    let didFit = false;
    const tryFit = () => {
      if (didFit) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        fitToAgents(0);
        didFit = true;
      }
    };

    tryFit();
    const ro = new ResizeObserver(tryFit);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [nodesInitialized, agentBounds, fitToAgents]);

  const nodes = useMemo(
    () =>
      layout.nodes.map((n) => {
        if (n.type !== "agent") return n;
        const data = n.data as AgentNodeData;
        return {
          ...n,
          data: { ...data, selected: n.id === selectedId },
        };
      }),
    [layout.nodes, selectedId],
  );

  const handleNodeEnter = useCallback<NodeMouseHandler>(
    (event, node) => {
      if (node.type !== "agent") return;
      const data = node.data as AgentNodeData;
      const frame = frameRef.current;
      if (!frame) return;

      const target = (event.currentTarget as HTMLElement) ?? null;
      const rect = target?.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      if (!rect) return;

      const nodeCenterX = rect.left + rect.width / 2 - frameRect.left;
      const nodeCenterY = rect.top + rect.height / 2 - frameRect.top;

      const desiredLeft = nodeCenterX + 32;
      const desiredTop = nodeCenterY - 30;

      const left = Math.max(8, Math.min(desiredLeft, frameRect.width - HOVER_W - 8));
      const top = Math.max(8, Math.min(desiredTop, frameRect.height - 140));

      setHover({ agent: data.agent, left, top });
    },
    [],
  );

  const handleNodeLeave = useCallback<NodeMouseHandler>(() => {
    setHover(null);
  }, []);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      if (node.type !== "agent") return;
      const data = node.data as AgentNodeData;
      setSelectedId(node.id);
      if (onAgentClick) onAgentClick(data.agent);
      else console.log("[tree] agent clicked:", data.agent);
    },
    [onAgentClick],
  );

  const isEmpty = !isLoading && agents.length === 0;

  return (
    <Frame ref={frameRef}>
      <ReactFlow
        nodes={nodes}
        edges={layout.edges}
        nodeTypes={NODE_TYPES}
        onNodeMouseEnter={handleNodeEnter}
        onNodeMouseLeave={handleNodeLeave}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setHover(null)}
        minZoom={0.4}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={0.5}
          color="rgba(120, 140, 180, 0.18)"
        />
      </ReactFlow>
      <ZoomControls onFit={() => fitToAgents(200)} />
      <HoverHost>
        {hover && (
          <HoverCard agent={hover.agent} left={hover.left} top={hover.top} />
        )}
      </HoverHost>
      {!isEmpty && (
        <Hint>hover any node for details · click to open chat</Hint>
      )}
      {isEmpty && <EmptyTree />}
    </Frame>
  );
}

export default function TreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
