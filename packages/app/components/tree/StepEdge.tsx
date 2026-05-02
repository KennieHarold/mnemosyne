"use client";

import { memo } from "react";
import { BaseEdge, type EdgeProps } from "@xyflow/react";

export type StepEdgeData = {
  sourceIndex?: number;
  sourceCount?: number;
  targetIndex?: number;
  targetCount?: number;
};

const SOURCE_SPREAD = 16;
const TARGET_SPREAD = 10;

function StepEdgeImpl(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    markerEnd,
    markerStart,
  } = props;
  const data = (props.data ?? {}) as StepEdgeData;
  const sIdx = data.sourceIndex ?? 0;
  const sCount = data.sourceCount ?? 1;
  const tIdx = data.targetIndex ?? 0;
  const tCount = data.targetCount ?? 1;

  const dy = targetY - sourceY;
  const center = sourceY + dy / 2;

  // Stagger horizontal bend Y for edges sharing a source (siblings) or
  // a target (multi-parent), so overlapping segments fan out vertically.
  const sBias =
    sCount > 1 ? (sIdx - (sCount - 1) / 2) * (SOURCE_SPREAD / (sCount - 1)) * 2 : 0;
  const tBias =
    tCount > 1 ? (tIdx - (tCount - 1) / 2) * (TARGET_SPREAD / (tCount - 1)) * 2 : 0;

  // Clamp so the horizontal stays between source and target rows.
  const minMid = sourceY + 12;
  const maxMid = targetY - 12;
  const midY = Math.max(minMid, Math.min(maxMid, center + sBias + tBias));

  const path = `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
    />
  );
}

export const StepEdge = memo(StepEdgeImpl);
