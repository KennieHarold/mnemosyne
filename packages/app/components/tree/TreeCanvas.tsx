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
import { StepEdge, type StepEdgeData } from "./StepEdge";
import HoverCard, { HOVER_W } from "./HoverCard";
import ZoomControls from "./ZoomControls";
import EmptyTree from "./EmptyTree";

const NODE_SIZE = 56;
const RULER_MIN_WIDTH = 1400;
const NODE_SLOT_W = 96;
const SUBTREE_GAP = 24;
const GEN_H = 110;
const TOP_PAD = 60;
const SIDE_PAD = 80;

const Frame = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  background: ${({ theme }) => theme.bg.base};
  background-image:
    linear-gradient(rgba(120, 140, 180, 0.07) 0.5px, transparent 0.5px),
    linear-gradient(90deg, rgba(120, 140, 180, 0.07) 0.5px, transparent 0.5px);
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

const EDGE_TYPES = {
  tree: StepEdge,
};

type HoverState = {
  agent: Agent;
  left: number;
  top: number;
} | null;

function generationY(gen: number): number {
  return TOP_PAD + (gen - 1) * GEN_H;
}

function buildLayout(agents: Agent[]): {
  nodes: Node[];
  edges: Edge[];
} {
  const byId = new Map<string, Agent>();
  for (const a of agents) byId.set(a.tokenId.toString(), a);

  // Primary-parent tree: each node belongs to its first parent's subtree.
  // Secondary parents are still drawn as edges but don't influence layout.
  const childrenOf = new Map<string, Agent[]>();
  const roots: Agent[] = [];
  for (const a of agents) {
    const primaryId =
      a.parentIds && byId.has(a.parentIds[0].toString())
        ? a.parentIds[0].toString()
        : null;
    if (primaryId) {
      const list = childrenOf.get(primaryId) ?? [];
      list.push(a);
      childrenOf.set(primaryId, list);
    } else {
      roots.push(a);
    }
  }

  const sortByToken = (a: Agent, b: Agent) => Number(a.tokenId - b.tokenId);
  for (const list of childrenOf.values()) list.sort(sortByToken);
  roots.sort(sortByToken);

  // Subtree width = max(slot, sum of child widths + gaps).
  const widths = new Map<string, number>();
  function calcWidth(a: Agent): number {
    const id = a.tokenId.toString();
    const cached = widths.get(id);
    if (cached !== undefined) return cached;
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) {
      widths.set(id, NODE_SLOT_W);
      return NODE_SLOT_W;
    }
    let total = 0;
    for (let i = 0; i < kids.length; i++) {
      total += calcWidth(kids[i]);
      if (i > 0) total += SUBTREE_GAP;
    }
    const w = Math.max(NODE_SLOT_W, total);
    widths.set(id, w);
    return w;
  }
  for (const r of roots) calcWidth(r);

  // Place each subtree starting at leftX; parent center = midpoint of
  // first/last child centers (so a single child sits directly below).
  const positions = new Map<string, { x: number; y: number }>();
  function place(a: Agent, leftX: number) {
    const id = a.tokenId.toString();
    const kids = childrenOf.get(id) ?? [];
    const myWidth = widths.get(id) ?? NODE_SLOT_W;
    const y = generationY(a.generation);

    if (kids.length === 0) {
      positions.set(id, { x: leftX + myWidth / 2, y });
      return;
    }

    const childrenTotal = kids.reduce((sum, c, i) => {
      const cw = widths.get(c.tokenId.toString()) ?? NODE_SLOT_W;
      return sum + cw + (i > 0 ? SUBTREE_GAP : 0);
    }, 0);
    let cursor = leftX + (myWidth - childrenTotal) / 2;
    const childCenters: number[] = [];
    for (const c of kids) {
      const cw = widths.get(c.tokenId.toString()) ?? NODE_SLOT_W;
      place(c, cursor);
      childCenters.push(positions.get(c.tokenId.toString())!.x);
      cursor += cw + SUBTREE_GAP;
    }
    const center =
      (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    positions.set(id, { x: center, y });
  }

  let cursor = SIDE_PAD;
  for (const r of roots) {
    place(r, cursor);
    cursor += (widths.get(r.tokenId.toString()) ?? NODE_SLOT_W) + SUBTREE_GAP;
  }

  // Compute ruler bounds from actual node spread.
  let minX = Infinity;
  let maxX = -Infinity;
  for (const { x } of positions.values()) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = RULER_MIN_WIDTH;
  }
  const rulerLeft = Math.min(minX - SIDE_PAD, 0);
  const rulerRight = Math.max(maxX + SIDE_PAD, rulerLeft + RULER_MIN_WIDTH);
  const rulerWidth = rulerRight - rulerLeft;

  const nodes: Node[] = [];
  for (let gen = 1; gen <= TOTAL_GENERATIONS; gen++) {
    nodes.push({
      id: `ruler-${gen}`,
      type: "ruler",
      position: { x: rulerLeft, y: generationY(gen) - 26 },
      data: {
        label: `gen ${String(gen).padStart(2, "0")}`,
        width: rulerWidth,
      } satisfies RulerNodeData,
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
    });
  }

  for (const a of agents) {
    const pos = positions.get(a.tokenId.toString());
    if (!pos) continue;
    nodes.push({
      id: a.tokenId.toString(),
      type: "agent",
      position: { x: pos.x - NODE_SIZE / 2, y: pos.y - NODE_SIZE / 2 },
      data: { agent: a, selected: false } satisfies AgentNodeData,
      draggable: false,
      zIndex: 2,
      width: NODE_SIZE,
      height: NODE_SIZE,
    });
  }

  const edges: Edge[] = [];
  for (const a of agents) {
    if (!a.parentIds) continue;
    const targetKey = a.tokenId.toString();
    const seen = new Set<string>();
    for (const pid of a.parentIds) {
      const sourceKey = pid.toString();
      if (seen.has(sourceKey)) continue;
      seen.add(sourceKey);
      if (!positions.has(sourceKey)) continue;
      edges.push({
        id: `${sourceKey}->${targetKey}`,
        source: sourceKey,
        target: targetKey,
        type: "tree",
        data: {} satisfies StepEdgeData,
        style: {
          stroke: "rgba(143, 164, 194, 0.45)",
          strokeWidth: 0.5,
          fill: "none",
        },
      });
    }
  }

  // Tag each edge with its sibling index/count so the custom edge can
  // stagger the horizontal bend Y for edges that share a source (parent
  // with multiple children) or share a target (child with two parents).
  const xOf = (id: string) => positions.get(id)?.x ?? 0;
  const bySource = new Map<string, Edge[]>();
  const byTarget = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!bySource.has(e.source)) bySource.set(e.source, []);
    bySource.get(e.source)!.push(e);
    if (!byTarget.has(e.target)) byTarget.set(e.target, []);
    byTarget.get(e.target)!.push(e);
  }
  for (const list of bySource.values()) {
    list.sort((a, b) => xOf(a.target) - xOf(b.target));
    list.forEach((e, i) => {
      e.data = {
        ...(e.data as StepEdgeData),
        sourceIndex: i,
        sourceCount: list.length,
      } satisfies StepEdgeData;
    });
  }
  for (const list of byTarget.values()) {
    list.sort((a, b) => xOf(a.source) - xOf(b.source));
    list.forEach((e, i) => {
      e.data = {
        ...(e.data as StepEdgeData),
        targetIndex: i,
        targetCount: list.length,
      } satisfies StepEdgeData;
    });
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
  const hideTimerRef = useRef<number | null>(null);
  const nodeHoverRef = useRef(false);
  const cardHoverRef = useRef(false);
  const [hover, setHover] = useState<HoverState>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reactFlow = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const maybeScheduleHide = useCallback(() => {
    cancelHide();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      if (!nodeHoverRef.current && !cardHoverRef.current) {
        setHover(null);
      }
    }, 10);
  }, [cancelHide]);

  useEffect(() => () => cancelHide(), [cancelHide]);

  const layout = useMemo(() => buildLayout(agents), [agents]);

  // Direct parent / child adjacency, used to compute lineage on hover.
  // Includes both parents (DAG), not just the layout-primary parent.
  const adjacency = useMemo(() => {
    const parents = new Map<string, string[]>();
    const children = new Map<string, string[]>();
    const ids = new Set(agents.map((a) => a.tokenId.toString()));
    for (const a of agents) {
      if (!a.parentIds) continue;
      const tid = a.tokenId.toString();
      const ps: string[] = [];
      for (const pid of a.parentIds) {
        const sid = pid.toString();
        if (!ids.has(sid) || ps.includes(sid)) continue;
        ps.push(sid);
        const cs = children.get(sid) ?? [];
        cs.push(tid);
        children.set(sid, cs);
      }
      if (ps.length) parents.set(tid, ps);
    }
    return { parents, children };
  }, [agents]);

  const focusedId = hover?.agent.tokenId.toString() ?? selectedId ?? null;

  const lineage = useMemo(() => {
    if (!focusedId) return null;
    const set = new Set<string>([focusedId]);
    const up = [focusedId];
    while (up.length) {
      const id = up.pop()!;
      const ps = adjacency.parents.get(id);
      if (!ps) continue;
      for (const p of ps) if (!set.has(p)) { set.add(p); up.push(p); }
    }
    const down = [focusedId];
    while (down.length) {
      const id = down.pop()!;
      const cs = adjacency.children.get(id);
      if (!cs) continue;
      for (const c of cs) if (!set.has(c)) { set.add(c); down.push(c); }
    }
    return set;
  }, [focusedId, adjacency]);

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
        const dim = lineage !== null && !lineage.has(n.id);
        return {
          ...n,
          data: { ...data, selected: n.id === selectedId },
          style: dim ? { opacity: 0.18 } : undefined,
        };
      }),
    [layout.nodes, selectedId, lineage],
  );

  const edges = useMemo(() => {
    if (!lineage) return layout.edges;
    return layout.edges.map((e) => {
      const active = lineage.has(e.source) && lineage.has(e.target);
      return {
        ...e,
        style: {
          ...e.style,
          stroke: active
            ? "rgba(93, 202, 165, 0.95)"
            : "rgba(143, 164, 194, 0.10)",
          strokeWidth: active ? 1 : 0.5,
        },
        zIndex: active ? 5 : 1,
      };
    });
  }, [lineage, layout.edges]);

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

      const desiredLeft = nodeCenterX + 34;
      const desiredTop = nodeCenterY - 30;

      const left = Math.max(
        8,
        Math.min(desiredLeft, frameRect.width - HOVER_W - 8),
      );
      const top = Math.max(8, Math.min(desiredTop, frameRect.height - 160));

      nodeHoverRef.current = true;
      cancelHide();
      setHover({ agent: data.agent, left, top });
    },
    [cancelHide],
  );

  const handleNodeLeave = useCallback<NodeMouseHandler>(() => {
    nodeHoverRef.current = false;
    maybeScheduleHide();
  }, [maybeScheduleHide]);

  const handleCardEnter = useCallback(() => {
    cardHoverRef.current = true;
    cancelHide();
  }, [cancelHide]);

  const handleCardLeave = useCallback(() => {
    cardHoverRef.current = false;
    maybeScheduleHide();
  }, [maybeScheduleHide]);

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

  const handleCtaClick = useCallback(() => {
    if (!hover) return;
    cancelHide();
    setSelectedId(hover.agent.tokenId.toString());
    if (onAgentClick) onAgentClick(hover.agent);
    else console.log("[tree] agent clicked:", hover.agent);
    setHover(null);
  }, [hover, cancelHide, onAgentClick]);

  const isEmpty = !isLoading && agents.length === 0;

  return (
    <Frame ref={frameRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
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
          <HoverCard
            agent={hover.agent}
            left={hover.left}
            top={hover.top}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
            onCtaClick={handleCtaClick}
          />
        )}
      </HoverHost>
      {!isEmpty && <Hint>hover any node for details · click to open chat</Hint>}
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
